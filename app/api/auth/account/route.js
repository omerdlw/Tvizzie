import { NextResponse } from 'next/server';

import { assertPasswordProviderLinked, hasPasswordProvider } from '@/core/auth/servers/account.js';
import {
  ACCOUNT_LIFECYCLE_STATES,
  abortAccountDeleteLifecycle,
  beginAccountDeleteLifecycle,
  completeAccountDeleteLifecycle,
} from '@/core/auth/servers/account.js';
import { EMAIL_ACCOUNT_STATES, resolveEmailAccountState } from '@/core/auth/servers/account.js';
import { writeAuthAuditLog } from '@/core/auth/servers/audit.js';
import { AUTH_ROUTE_POLICY_KEYS, requirePolicySession } from '@/core/auth/servers/policy.js';
import { requireSessionRequest } from '@/core/auth/servers/session.js';
import { getRequestContext } from '@/core/auth/servers/session.js';
import { clearAuthCookies } from '@/core/auth/servers/session.js';
import { assertCsrfRequest } from '@/core/auth/servers/security.js';
import {
  validateStrongPassword,
  verifyPasswordWithIdentityToolkit,
} from '@/core/auth/servers/security.js';
import {
  assertRecentReauth,
  clearRecentReauthCookie,
  createRecentReauthToken,
  setRecentReauthCookie,
} from '@/core/auth/servers/security.js';
import {
  AUTH_RATE_LIMIT_POLICY_KEYS,
  enforceAuthRateLimit,
} from '@/core/auth/servers/security.js';
import {
  enforceSlidingWindowRateLimit,
  isSlidingWindowRateLimitError,
} from '@/core/auth/servers/security.js';
import { assertStepUp, clearStepUpCookie } from '@/core/auth/servers/security.js';
import {
  lookupPasswordAccountByEmail,
  resolvePasswordAccountIdentifier,
} from '@/core/auth/servers/verification.js';
import { createAdminClient } from '@/core/clients/supabase/admin';
import { ACCOUNT_WRITE_FUNCTION } from '@/core/services/account/account.constants';
import { createApiErrorResponse, createApiSuccessResponse } from '@/core/services/shared';
import { buildInternalRequestMeta } from '@/core/services/shared';
import { invokeInternalEdgeFunction } from '@/core/services/shared';

const ACCOUNT_ACTIONS = Object.freeze({
  CHANGE_EMAIL: 'change-email',
  CHANGE_PASSWORD: 'change-password',
  DELETE: 'delete',
  PASSWORD_STATUS: 'password-status',
  REAUTHENTICATE: 'reauthenticate',
  SET_PASSWORD: 'set-password',
});

const ACTION_ALIASES = Object.freeze({
  'account-delete': ACCOUNT_ACTIONS.DELETE,
  'delete-account': ACCOUNT_ACTIONS.DELETE,
  'email-change': ACCOUNT_ACTIONS.CHANGE_EMAIL,
  'password-change': ACCOUNT_ACTIONS.CHANGE_PASSWORD,
  'password-set': ACCOUNT_ACTIONS.SET_PASSWORD,
});

const ACTION_SOURCES = Object.freeze({
  [ACCOUNT_ACTIONS.CHANGE_EMAIL]: 'api/auth/account/change-email',
  [ACCOUNT_ACTIONS.CHANGE_PASSWORD]: 'api/auth/account/change-password',
  [ACCOUNT_ACTIONS.DELETE]: 'api/auth/account/delete',
  [ACCOUNT_ACTIONS.PASSWORD_STATUS]: 'api/auth/account/password-status',
  [ACCOUNT_ACTIONS.REAUTHENTICATE]: 'api/auth/account/reauthenticate',
  [ACCOUNT_ACTIONS.SET_PASSWORD]: 'api/auth/account/set-password',
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INTENTS = Object.freeze({
  PASSWORD_RESET: 'password-reset',
  SIGN_IN: 'sign-in',
  SIGN_UP: 'sign-up',
});

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeEmail(value) {
  return normalizeValue(value).toLowerCase();
}

function normalizePassword(value) {
  return String(value || '');
}

function normalizeAction(value) {
  const normalizedAction = normalizeValue(value).toLowerCase();

  return ACTION_ALIASES[normalizedAction] || normalizedAction;
}

function normalizeIntent(value) {
  const normalizedIntent = normalizeValue(value).toLowerCase();

  if (Object.values(INTENTS).includes(normalizedIntent)) {
    return normalizedIntent;
  }

  return INTENTS.SIGN_IN;
}

function buildRequestMeta(request, action) {
  return buildInternalRequestMeta({
    request,
    source: ACTION_SOURCES[action] || 'api/auth/account',
  });
}

function createStatusPayload({
  email,
  lookup = null,
  accountExists = false,
  accountState = null,
  passwordEnabled = false,
  signInMethods = [],
  allowedIntent = null,
  messageCode = null,
}) {
  return {
    accountExists,
    accountState,
    allowedIntent,
    email,
    messageCode,
    passwordEnabled,
    signInMethods: Array.isArray(signInMethods)
      ? signInMethods
      : Array.isArray(lookup?.signInMethods)
        ? lookup.signInMethods
        : [],
  };
}

function resolveLookupError(intent, code) {
  if (code === 'auth/user-not-found') {
    return {
      allowedIntent: intent === INTENTS.SIGN_UP ? INTENTS.SIGN_UP : null,
      messageCode: intent === INTENTS.SIGN_UP ? 'SIGNUP_ALLOWED' : 'ACCOUNT_NOT_FOUND',
      error:
        intent === INTENTS.SIGN_UP
          ? 'This email can be used to create a new account'
          : 'No account was found with this email address',
      status: intent === INTENTS.SIGN_UP ? 200 : 404,
    };
  }

  if (code === 'auth/password-sign-in-disabled') {
    return {
      allowedIntent: 'google-sign-in',
      messageCode: 'PASSWORD_SIGN_IN_DISABLED',
      error:
        intent === INTENTS.PASSWORD_RESET
          ? 'Password reset is not available for this account'
          : 'This account does not have email/password sign-in enabled',
      status: 409,
    };
  }

  if (code === 'auth/password-reset-unavailable') {
    return {
      allowedIntent: null,
      messageCode: 'PASSWORD_RESET_UNAVAILABLE',
      error: 'Password reset is not available for this account',
      status: 409,
    };
  }

  return {
    allowedIntent: null,
    messageCode: 'ACCOUNT_STATUS_UNRESOLVED',
    error: 'Account status could not be resolved',
    status: 500,
  };
}

function resolveDeleteErrorMessage(error) {
  const rawMessage = normalizeValue(error?.message);
  const errorCode = normalizeValue(error?.code);

  if (rawMessage.includes('FAILED_PRECONDITION') || errorCode === '9' || errorCode === 'failed-precondition') {
    return 'Account deletion is temporarily unavailable. Please try again';
  }

  return rawMessage || 'Account could not be deleted';
}

function buildDeleteSuccessResponse({ request, requestMeta, sessionJti, userId }) {
  const response = createApiSuccessResponse(
    {
      messageCode: 'ACCOUNT_DELETED',
      nextAction: 'signed_out',
    },
    {
      code: 'ACCOUNT_DELETED',
      legacyPayload: {
        ok: true,
        nextAction: 'signed_out',
        messageCode: 'ACCOUNT_DELETED',
      },
      requestMeta: {
        ...requestMeta,
        sessionId: sessionJti,
        userId,
      },
    }
  );
  clearAuthCookies(response, request);
  clearStepUpCookie(response);
  return response;
}

async function syncProfileEmail({ userId, email, request = null, requestMeta = null }) {
  const normalizedUserId = normalizeValue(userId);
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedUserId) {
    throw new Error('Authenticated user is required');
  }

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Enter a valid email address');
  }

  const result = await invokeInternalEdgeFunction(ACCOUNT_WRITE_FUNCTION, {
    body: {
      action: 'sync-email',
      email: normalizedEmail,
      userId: normalizedUserId,
    },
    request,
    requestMeta,
  });

  if (result?.ok !== true) {
    throw new Error('Profile email could not be synced');
  }
}

async function rollbackEmailChange({ adminAuth, userId, previousEmail, request = null, requestMeta = null }) {
  const normalizedPreviousEmail = normalizeEmail(previousEmail);

  if (!normalizedPreviousEmail) {
    return;
  }

  await adminAuth.updateUser(userId, {
    email: normalizedPreviousEmail,
    emailVerified: true,
  });
  await syncProfileEmail({
    userId,
    email: normalizedPreviousEmail,
    request,
    requestMeta,
  });
}

async function signOutAuthSession(accessToken, scope = 'local') {
  const normalizedAccessToken = normalizeValue(accessToken);

  if (!normalizedAccessToken) {
    throw new Error('Authenticated access token is required');
  }

  const result = await createAdminClient().auth.admin.signOut(normalizedAccessToken, scope);

  if (result.error) {
    throw new Error(result.error.message || 'Authentication session could not be terminated');
  }

  return true;
}

async function assertEmailAvailable(adminAuth, email) {
  try {
    const existingUser = await adminAuth.getUserByEmail(email);

    if (existingUser?.uid) {
      throw new Error('This email address is already in use');
    }
  } catch (error) {
    if (normalizeValue(error?.code) === 'auth/user-not-found') {
      return;
    }

    throw error;
  }
}

async function handlePasswordStatus(request, body) {
  const requestContext = getRequestContext(request);

  try {
    const identifier = normalizeValue(body?.identifier || body?.email);
    const emailInput = normalizeValue(body?.email);
    const intent = normalizeIntent(body?.intent);
    const lookupTarget = intent === INTENTS.SIGN_UP ? emailInput : identifier;

    await enforceSlidingWindowRateLimit({
      namespace: `auth:account:password-status:${intent}`,
      windowMs: 15 * 60 * 1000,
      dimensions: [
        { id: 'identifier', value: lookupTarget, limit: 10 },
        { id: 'ip', value: requestContext.ipAddress || 'unknown', limit: 40 },
        { id: 'device', value: requestContext.deviceId || 'unknown', limit: 25 },
      ],
      message: 'Too many account lookup requests',
    });

    let resolvedEmail = emailInput;

    if (intent !== INTENTS.SIGN_UP) {
      try {
        resolvedEmail = (await resolvePasswordAccountIdentifier(identifier)).email;
      } catch (error) {
        if (normalizeValue(error?.code) === 'auth/user-not-found') {
          const resolvedError = resolveLookupError(intent, 'auth/user-not-found');

          return NextResponse.json(
            {
              ...createStatusPayload({
                email: null,
                lookup: null,
                accountExists: false,
                accountState: null,
                passwordEnabled: false,
                allowedIntent: resolvedError.allowedIntent,
                messageCode: resolvedError.messageCode,
              }),
              code: resolvedError.messageCode,
              email: null,
              error: resolvedError.error,
            },
            { status: resolvedError.status }
          );
        }

        throw error;
      }
    }

    const lookup =
      intent === INTENTS.SIGN_UP
        ? null
        : await lookupPasswordAccountByEmail(resolvedEmail, {
            requireProfile: intent === INTENTS.PASSWORD_RESET,
          });

    if (intent === INTENTS.SIGN_UP) {
      const accountState = await resolveEmailAccountState(resolvedEmail);

      if (accountState.state === EMAIL_ACCOUNT_STATES.EXISTING_GOOGLE_ONLY) {
        return NextResponse.json(
          {
            ...createStatusPayload({
              accountExists: true,
              accountState: accountState.state,
              email: accountState.email,
              lookup: accountState.lookup,
              passwordEnabled: false,
              allowedIntent: 'google-sign-in',
              messageCode: 'GOOGLE_ACCOUNT_EXISTS',
            }),
            code: 'SIGNUP_GOOGLE_ACCOUNT_EXISTS',
            error: 'This email is already used by a Google-linked Tvizzie account. Continue with Google to sign in.',
          },
          { status: 409 }
        );
      }

      if (accountState.state === EMAIL_ACCOUNT_STATES.EXISTING_PASSWORD_ACCOUNT) {
        return NextResponse.json(
          {
            ...createStatusPayload({
              accountExists: true,
              accountState: accountState.state,
              email: accountState.email,
              lookup: accountState.lookup,
              passwordEnabled: true,
              allowedIntent: INTENTS.SIGN_IN,
              messageCode: 'EMAIL_IN_USE',
            }),
            code: 'SIGNUP_EMAIL_IN_USE',
            error: 'This email address is already in use. Sign in instead.',
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        createStatusPayload({
          email: accountState.email,
          lookup: accountState.lookup,
          accountExists: accountState.state === EMAIL_ACCOUNT_STATES.RECOVERABLE_PASSWORD_ORPHAN,
          accountState: accountState.state,
          passwordEnabled: accountState.state === EMAIL_ACCOUNT_STATES.RECOVERABLE_PASSWORD_ORPHAN,
          allowedIntent: INTENTS.SIGN_UP,
          messageCode:
            accountState.state === EMAIL_ACCOUNT_STATES.RECOVERABLE_PASSWORD_ORPHAN
              ? 'SIGNUP_RECOVERY_ALLOWED'
              : 'SIGNUP_ALLOWED',
          signInMethods:
            accountState.state === EMAIL_ACCOUNT_STATES.RECOVERABLE_PASSWORD_ORPHAN
              ? accountState.lookup?.signInMethods
              : [],
        })
      );
    }

    if (!lookup.eligible) {
      const resolvedError = resolveLookupError(intent, lookup.code);

      return NextResponse.json(
        {
          ...createStatusPayload({
            email: lookup.email,
            lookup,
            accountExists: Boolean(lookup.exists),
            accountState: null,
            passwordEnabled: Boolean(lookup.supportsPasswordAuth),
            allowedIntent: resolvedError.allowedIntent,
            messageCode: resolvedError.messageCode,
          }),
          code: resolvedError.messageCode,
          email: lookup.email,
          error: resolvedError.error,
        },
        { status: resolvedError.status }
      );
    }

    return NextResponse.json(
      createStatusPayload({
        email: lookup.email,
        lookup,
        accountExists: Boolean(lookup.exists),
        accountState: null,
        passwordEnabled: Boolean(lookup.supportsPasswordAuth),
        allowedIntent: intent === INTENTS.PASSWORD_RESET ? INTENTS.PASSWORD_RESET : INTENTS.SIGN_IN,
        messageCode: intent === INTENTS.PASSWORD_RESET ? 'PASSWORD_RESET_ALLOWED' : 'SIGNIN_ALLOWED',
      })
    );
  } catch (error) {
    const message = String(error?.message || 'Account status could not be resolved');
    const status = isSlidingWindowRateLimitError(error)
      ? 429
      : message.includes('Enter a valid email address') || message.includes('Username or email is required')
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

async function handleReauthenticate(request, body) {
  try {
    const currentPassword = normalizePassword(body?.currentPassword);

    if (!currentPassword) {
      return NextResponse.json({ error: 'currentPassword is required' }, { status: 400 });
    }

    assertCsrfRequest(request);

    const authContext = await requireSessionRequest(request, {
      allowBearerFallback: true,
    });

    assertPasswordProviderLinked(authContext.userRecord);

    await verifyPasswordWithIdentityToolkit({
      email: normalizeEmail(authContext.email),
      password: currentPassword,
    });

    const response = NextResponse.json({
      ok: true,
      verifiedAt: new Date().toISOString(),
    });

    setRecentReauthCookie(
      response,
      createRecentReauthToken({
        email: authContext.email,
        sessionJti: authContext.sessionJti,
        userId: authContext.userId,
      })
    );

    return response;
  } catch (error) {
    const message = String(error?.message || 'Reauthentication failed');
    const status = message.includes('Invalid CSRF token')
      ? 403
      : message.includes('Authentication session is required') ||
          message.includes('Invalid or expired authentication token') ||
          message.includes('Authentication token has been revoked')
        ? 401
        : message.includes('required') ||
            message.includes('incorrect') ||
            message.includes('disabled') ||
            message.includes('email/password sign-in enabled')
          ? 400
          : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

async function handleDeleteAccount(request, body) {
  const requestContext = getRequestContext(request);
  const requestMeta = buildRequestMeta(request, ACCOUNT_ACTIONS.DELETE);
  let userId = null;
  let email = null;
  let challengeJti = null;
  let sessionJti = null;
  let auditProvider = 'password';
  let deleteLifecycleStarted = false;
  let deleteLifecycleState = ACCOUNT_LIFECYCLE_STATES.ACTIVE;

  try {
    const currentPassword = normalizePassword(body?.currentPassword);

    assertCsrfRequest(request);

    const authContext = await requirePolicySession(request, AUTH_ROUTE_POLICY_KEYS.ACCOUNT_DELETE);

    userId = authContext.userId;
    sessionJti = authContext.sessionJti || null;
    email = normalizeEmail(authContext.email);
    const passwordLinked = hasPasswordProvider(authContext.userRecord);
    auditProvider = passwordLinked ? 'password' : 'google';
    const stepUp = assertStepUp(request, {
      purpose: 'account-delete',
      userId,
    });
    challengeJti = stepUp?.challengeJti || null;

    await enforceAuthRateLimit(AUTH_RATE_LIMIT_POLICY_KEYS.ACCOUNT_DELETE, {
      dimensionValues: {
        device: requestContext.deviceId,
        ip: requestContext.ipAddress,
        user: userId,
      },
    });

    if (passwordLinked) {
      if (!currentPassword) {
        return createApiErrorResponse(
          {
            code: 'VALIDATION_ERROR',
            message: 'currentPassword is required',
          },
          {
            requestMeta: {
              ...requestMeta,
              sessionId: sessionJti,
              userId,
            },
            status: 400,
          }
        );
      }

      assertPasswordProviderLinked(authContext.userRecord);

      await verifyPasswordWithIdentityToolkit({
        email,
        password: currentPassword,
      });
    }

    const lifecycleTransition = await beginAccountDeleteLifecycle({
      idempotencyKey: requestMeta.idempotencyKey,
      requestId: requestMeta.requestId,
      sessionJti,
      userId,
    });
    deleteLifecycleState = lifecycleTransition.state;

    if (lifecycleTransition.state === ACCOUNT_LIFECYCLE_STATES.DELETED) {
      await writeAuthAuditLog({
        request,
        eventType: 'delete-account',
        status: 'success',
        userId,
        email,
        provider: auditProvider,
        sessionJti,
        requestId: requestMeta.requestId,
        outcome: 'already_deleted',
        metadata: {
          action: 'account-delete',
          challengeJti,
          lifecycleReason: lifecycleTransition.reason,
          sessionJti,
          source: ACTION_SOURCES[ACCOUNT_ACTIONS.DELETE],
        },
      }).catch((auditError) => {
        console.error('[AuthAudit] account-delete idempotent success log failed:', auditError);
      });

      return buildDeleteSuccessResponse({
        request,
        requestMeta,
        sessionJti,
        userId,
      });
    }

    if (!lifecycleTransition.accepted) {
      return createApiErrorResponse(
        {
          code: 'ACCOUNT_DELETE_IN_PROGRESS',
          message: 'Account deletion is already in progress',
          retryable: false,
        },
        {
          requestMeta: {
            ...requestMeta,
            sessionId: sessionJti,
            userId,
          },
          status: 409,
        }
      );
    }

    deleteLifecycleStarted = true;

    const deleteResult = await invokeInternalEdgeFunction('account-delete-orchestrator', {
      body: {
        deleteAuthUser: true,
        userId,
      },
      request,
      requestMeta: {
        ...requestMeta,
        sessionId: sessionJti,
        userId,
      },
      source: 'account-delete-orchestrator',
    });

    if (deleteResult?.ok !== true) {
      throw new Error('Account deletion could not be completed');
    }

    await completeAccountDeleteLifecycle({
      metadata: {
        edgeSource: 'account-delete-orchestrator',
        outcome: 'success',
      },
      requestId: requestMeta.requestId,
      sessionJti,
      userId,
    });
    deleteLifecycleState = ACCOUNT_LIFECYCLE_STATES.DELETED;

    await writeAuthAuditLog({
      request,
      eventType: 'delete-account',
      status: 'success',
      userId,
      email,
      provider: auditProvider,
      sessionJti,
      requestId: requestMeta.requestId,
      outcome: 'completed',
      metadata: {
        action: 'account-delete',
        challengeJti,
        lifecycleState: deleteLifecycleState,
        sessionJti,
        source: ACTION_SOURCES[ACCOUNT_ACTIONS.DELETE],
      },
    }).catch((auditError) => {
      console.error('[AuthAudit] account-delete success log failed:', auditError);
    });

    return buildDeleteSuccessResponse({
      request,
      requestMeta,
      sessionJti,
      userId,
    });
  } catch (error) {
    const message = resolveDeleteErrorMessage(error);

    if (deleteLifecycleStarted) {
      await abortAccountDeleteLifecycle({
        metadata: {
          error: message,
          lifecycleState: deleteLifecycleState,
        },
        reason: 'delete_failed',
        requestId: requestMeta.requestId,
        userId,
      }).catch((rollbackError) => {
        console.error('[Auth] account-delete lifecycle rollback failed:', rollbackError);
      });
      deleteLifecycleState = ACCOUNT_LIFECYCLE_STATES.ACTIVE;
    }

    const status = message.includes('Too many')
      ? 429
      : message.includes('Invalid CSRF token')
        ? 403
        : message.includes('already deleted')
          ? 410
          : message.includes('pending deletion') || message.includes('in progress')
            ? 409
            : message.includes('Authentication session is required') ||
                message.includes('Invalid or expired authentication token') ||
                message.includes('Authentication token has been revoked') ||
                message.includes('Recent authentication is required')
              ? 401
              : message.includes('required') ||
                  message.includes('invalid') ||
                  message.includes('incorrect') ||
                  message.includes('verification') ||
                  message.includes('disabled') ||
                  message.includes('email/password sign-in enabled')
                ? 400
                : 500;

    await writeAuthAuditLog({
      request,
      eventType: 'delete-account',
      status: status === 429 ? 'blocked' : 'failure',
      userId,
      email,
      provider: auditProvider,
      sessionJti,
      requestId: requestMeta.requestId,
      outcome: status === 429 ? 'blocked' : 'failed',
      metadata: {
        action: 'account-delete',
        challengeJti,
        csrfValid: !message.includes('Invalid CSRF token'),
        lifecycleState: deleteLifecycleState,
        message,
        sessionJti,
        source: ACTION_SOURCES[ACCOUNT_ACTIONS.DELETE],
        status,
        stepUpPurpose: 'account-delete',
      },
    }).catch((auditError) => {
      console.error('[AuthAudit] account-delete failure log failed:', auditError);
    });

    await writeAuthAuditLog({
      request,
      eventType: 'failed-attempt',
      status: status === 429 ? 'blocked' : 'failure',
      userId,
      email,
      provider: auditProvider,
      sessionJti,
      requestId: requestMeta.requestId,
      outcome: status === 429 ? 'blocked' : 'failed',
      metadata: {
        action: 'account-delete',
        challengeJti,
        csrfValid: !message.includes('Invalid CSRF token'),
        message,
        sessionJti,
        source: ACTION_SOURCES[ACCOUNT_ACTIONS.DELETE],
        status,
        stepUpPurpose: 'account-delete',
      },
    }).catch((auditError) => {
      console.error('[AuthAudit] failed-attempt account-delete log failed:', auditError);
    });

    return createApiErrorResponse(
      {
        code:
          status === 429
            ? 'RATE_LIMITED'
            : status === 409
              ? 'ACCOUNT_DELETE_IN_PROGRESS'
              : status === 410
                ? 'ACCOUNT_ALREADY_DELETED'
                : 'ACCOUNT_DELETE_FAILED',
        message,
        retryable: status >= 500,
      },
      {
        requestMeta: {
          ...requestMeta,
          sessionId: sessionJti,
          userId,
        },
        status,
      }
    );
  }
}

async function handleChangeEmail(request, body) {
  const requestContext = getRequestContext(request);
  const requestMeta = buildRequestMeta(request, ACCOUNT_ACTIONS.CHANGE_EMAIL);
  let userId = null;
  let previousEmail = null;
  let nextEmail = null;
  let challengeJti = null;
  let sessionJti = null;
  let serverSessionRevocationFailed = false;

  try {
    nextEmail = normalizeEmail(body?.email || body?.newEmail);

    if (!nextEmail || !EMAIL_PATTERN.test(nextEmail)) {
      return createApiErrorResponse(
        {
          code: 'VALIDATION_ERROR',
          message: 'email must be a valid email address',
        },
        { status: 400, requestMeta }
      );
    }

    assertCsrfRequest(request);

    const authContext = await requirePolicySession(request, AUTH_ROUTE_POLICY_KEYS.EMAIL_CHANGE_COMPLETE);

    userId = authContext.userId;
    sessionJti = authContext.sessionJti || null;
    previousEmail = normalizeEmail(authContext.email);
    assertRecentReauth(request, {
      sessionJti,
      userId,
    });
    const stepUp = assertStepUp(request, {
      email: nextEmail,
      purpose: 'email-change',
      userId,
    });
    challengeJti = stepUp?.challengeJti || null;

    if (nextEmail === previousEmail) {
      return createApiErrorResponse(
        {
          code: 'VALIDATION_ERROR',
          message: 'New email must be different from current email',
        },
        {
          requestMeta: {
            ...requestMeta,
            sessionId: sessionJti,
            userId,
          },
          status: 400,
        }
      );
    }

    await enforceAuthRateLimit(AUTH_RATE_LIMIT_POLICY_KEYS.EMAIL_CHANGE_COMPLETE, {
      dimensionValues: {
        device: requestContext.deviceId,
        ip: requestContext.ipAddress,
        user: userId,
      },
    });

    await assertEmailAvailable(authContext.adminAuth, nextEmail);

    let emailUpdated = false;

    try {
      await authContext.adminAuth.updateUser(userId, {
        email: nextEmail,
        emailVerified: true,
      });
      emailUpdated = true;

      await syncProfileEmail({
        userId,
        email: nextEmail,
        request,
        requestMeta: {
          ...requestMeta,
          sessionId: sessionJti,
          userId,
        },
      });
    } catch (mutationError) {
      if (emailUpdated) {
        await rollbackEmailChange({
          adminAuth: authContext.adminAuth,
          previousEmail,
          request,
          requestMeta: {
            ...requestMeta,
            sessionId: sessionJti,
            userId,
          },
          userId,
        }).catch((rollbackError) => {
          console.error('[Auth] email-change rollback failed:', rollbackError);
        });
      }

      throw mutationError;
    }

    try {
      await signOutAuthSession(authContext.accessToken, 'local');
    } catch (sessionError) {
      serverSessionRevocationFailed = true;
      console.error('[Auth] email-change session sign-out failed:', sessionError);
    }

    await writeAuthAuditLog({
      request,
      eventType: 'email-change',
      status: 'success',
      userId,
      email: nextEmail,
      provider: 'password',
      requestId: requestMeta.requestId,
      sessionJti,
      outcome: 'completed',
      metadata: {
        action: 'email-change-complete',
        challengeJti,
        googleProviderCleanupRequired: false,
        googleProviderDetached: false,
        googleProviderEmailMismatch: false,
        googleProviderEmail: null,
        previousEmail,
        sessionJti,
        serverSessionRevocationFailed,
        source: ACTION_SOURCES[ACCOUNT_ACTIONS.CHANGE_EMAIL],
      },
    }).catch((auditError) => {
      console.error('[AuthAudit] email-change success log failed:', auditError);
    });

    const response = createApiSuccessResponse(
      {
        email: nextEmail,
        messageCode: 'EMAIL_CHANGED',
        nextAction: 'signed_out',
      },
      {
        code: 'EMAIL_CHANGED',
        legacyPayload: {
          ok: true,
          nextAction: 'signed_out',
          messageCode: 'EMAIL_CHANGED',
          email: nextEmail,
        },
        requestMeta: {
          ...requestMeta,
          sessionId: sessionJti,
          userId,
        },
      }
    );
    clearAuthCookies(response, request);
    clearRecentReauthCookie(response);
    clearStepUpCookie(response);
    return response;
  } catch (error) {
    const message = String(error?.message || 'Email could not be changed');
    const status = message.includes('Too many')
      ? 429
      : message.includes('Invalid CSRF token')
        ? 403
        : message.includes('already deleted')
          ? 410
          : message.includes('pending deletion')
            ? 409
            : message.includes('Authentication session is required') ||
                message.includes('Invalid or expired authentication token') ||
                message.includes('Authentication token has been revoked') ||
                message.includes('Recent authentication is required')
              ? 401
              : message.includes('already in use')
                ? 409
                : message.includes('required') ||
                    message.includes('invalid') ||
                    message.includes('valid email') ||
                    message.includes('verification') ||
                    message.includes('different from current')
                  ? 400
                  : 500;

    await writeAuthAuditLog({
      request,
      eventType: 'email-change',
      status: status === 429 ? 'blocked' : 'failure',
      userId,
      email: nextEmail || previousEmail,
      provider: 'password',
      requestId: requestMeta.requestId,
      sessionJti,
      outcome: status === 429 ? 'blocked' : 'failed',
      metadata: {
        action: 'email-change-complete',
        challengeJti,
        csrfValid: !message.includes('Invalid CSRF token'),
        message,
        sessionJti,
        source: ACTION_SOURCES[ACCOUNT_ACTIONS.CHANGE_EMAIL],
        status,
        stepUpPurpose: 'email-change',
      },
    }).catch((auditError) => {
      console.error('[AuthAudit] email-change failure log failed:', auditError);
    });

    await writeAuthAuditLog({
      request,
      eventType: 'failed-attempt',
      status: status === 429 ? 'blocked' : 'failure',
      userId,
      email: nextEmail || previousEmail,
      provider: 'password',
      requestId: requestMeta.requestId,
      sessionJti,
      outcome: status === 429 ? 'blocked' : 'failed',
      metadata: {
        action: 'email-change-complete',
        challengeJti,
        csrfValid: !message.includes('Invalid CSRF token'),
        message,
        sessionJti,
        source: ACTION_SOURCES[ACCOUNT_ACTIONS.CHANGE_EMAIL],
        status,
        stepUpPurpose: 'email-change',
      },
    }).catch((auditError) => {
      console.error('[AuthAudit] failed-attempt email-change log failed:', auditError);
    });

    return createApiErrorResponse(
      {
        code: status === 429 ? 'RATE_LIMITED' : 'EMAIL_CHANGE_FAILED',
        message,
        retryable: status >= 500,
      },
      {
        requestMeta: {
          ...requestMeta,
          sessionId: sessionJti,
          userId,
        },
        status,
      }
    );
  }
}

async function handleChangePassword(request, body) {
  const requestContext = getRequestContext(request);
  const requestMeta = buildRequestMeta(request, ACCOUNT_ACTIONS.CHANGE_PASSWORD);
  let email = null;
  let userId = null;
  let challengeJti = null;
  let sessionJti = null;

  try {
    const currentPassword = normalizePassword(body?.currentPassword);
    const newPassword = validateStrongPassword(body?.newPassword);

    if (!currentPassword) {
      return createApiErrorResponse(
        {
          code: 'VALIDATION_ERROR',
          message: 'currentPassword is required',
        },
        { status: 400, requestMeta }
      );
    }

    assertCsrfRequest(request);

    const authContext = await requirePolicySession(request, AUTH_ROUTE_POLICY_KEYS.PASSWORD_CHANGE_COMPLETE);

    userId = authContext.userId;
    sessionJti = authContext.sessionJti || null;
    email = normalizeEmail(authContext.email);
    assertRecentReauth(request, {
      sessionJti,
      userId,
    });
    assertPasswordProviderLinked(authContext.userRecord);

    const stepUp = assertStepUp(request, {
      purpose: 'password-change',
      userId,
    });
    challengeJti = stepUp?.challengeJti || null;

    await enforceAuthRateLimit(AUTH_RATE_LIMIT_POLICY_KEYS.PASSWORD_CHANGE_COMPLETE, {
      dimensionValues: {
        device: requestContext.deviceId,
        ip: requestContext.ipAddress,
        user: userId,
      },
    });

    await verifyPasswordWithIdentityToolkit({
      email,
      password: currentPassword,
    });

    await authContext.adminAuth.updateUser(userId, {
      appMetadata: {
        ...(authContext.userRecord?.app_metadata || {}),
        tvz_password_enabled: true,
      },
      password: newPassword,
    });
    await authContext.adminAuth.revokeRefreshTokens(userId);

    await writeAuthAuditLog({
      request,
      eventType: 'password-change',
      status: 'success',
      userId,
      email,
      provider: 'password',
      requestId: requestMeta.requestId,
      sessionJti,
      outcome: 'completed',
      metadata: {
        action: 'password-change-complete',
        challengeJti,
        csrfValid: true,
        sessionJti,
        source: ACTION_SOURCES[ACCOUNT_ACTIONS.CHANGE_PASSWORD],
        stepUpPurpose: 'password-change',
      },
    }).catch((auditError) => {
      console.error('[AuthAudit] password-change success log failed:', auditError);
    });

    const response = createApiSuccessResponse(
      {
        messageCode: 'PASSWORD_CHANGED',
        nextAction: 'signed_out',
      },
      {
        code: 'PASSWORD_CHANGED',
        legacyPayload: {
          ok: true,
          nextAction: 'signed_out',
          messageCode: 'PASSWORD_CHANGED',
        },
        requestMeta: {
          ...requestMeta,
          sessionId: sessionJti,
          userId,
        },
      }
    );
    clearAuthCookies(response, request);
    clearRecentReauthCookie(response);
    clearStepUpCookie(response);
    return response;
  } catch (error) {
    const message = String(error?.message || 'Password could not be changed');
    const status = message.includes('Too many')
      ? 429
      : message.includes('Invalid CSRF token')
        ? 403
        : message.includes('already deleted')
          ? 410
          : message.includes('pending deletion')
            ? 409
            : message.includes('Authentication session is required') ||
                message.includes('Invalid or expired authentication token') ||
                message.includes('Authentication token has been revoked') ||
                message.includes('Recent authentication is required')
              ? 401
              : message.includes('required') ||
                  message.includes('invalid') ||
                  message.includes('incorrect') ||
                  message.includes('disabled') ||
                  message.includes('verification') ||
                  message.includes('must contain') ||
                  message.includes('at least')
                ? 400
                : 500;

    await writeAuthAuditLog({
      request,
      eventType: 'password-change',
      status: status === 429 ? 'blocked' : 'failure',
      userId,
      email,
      provider: 'password',
      requestId: requestMeta.requestId,
      sessionJti,
      outcome: status === 429 ? 'blocked' : 'failed',
      metadata: {
        action: 'password-change-complete',
        challengeJti,
        csrfValid: !message.includes('Invalid CSRF token'),
        message,
        sessionJti,
        source: ACTION_SOURCES[ACCOUNT_ACTIONS.CHANGE_PASSWORD],
        status,
        stepUpPurpose: 'password-change',
      },
    }).catch((auditError) => {
      console.error('[AuthAudit] password-change failure log failed:', auditError);
    });

    await writeAuthAuditLog({
      request,
      eventType: 'failed-attempt',
      status: status === 429 ? 'blocked' : 'failure',
      userId,
      email,
      provider: 'password',
      requestId: requestMeta.requestId,
      sessionJti,
      outcome: status === 429 ? 'blocked' : 'failed',
      metadata: {
        action: 'password-change-complete',
        challengeJti,
        csrfValid: !message.includes('Invalid CSRF token'),
        message,
        sessionJti,
        source: ACTION_SOURCES[ACCOUNT_ACTIONS.CHANGE_PASSWORD],
        status,
        stepUpPurpose: 'password-change',
      },
    }).catch((auditError) => {
      console.error('[AuthAudit] failed-attempt password-change log failed:', auditError);
    });

    return createApiErrorResponse(
      {
        code: status === 429 ? 'RATE_LIMITED' : 'PASSWORD_CHANGE_FAILED',
        message,
        retryable: status >= 500,
      },
      {
        requestMeta: {
          ...requestMeta,
          sessionId: sessionJti,
          userId,
        },
        status,
      }
    );
  }
}

async function handleSetPassword(request, body) {
  const requestContext = getRequestContext(request);
  const requestMeta = buildRequestMeta(request, ACCOUNT_ACTIONS.SET_PASSWORD);
  let email = null;
  let userId = null;
  let challengeJti = null;
  let sessionJti = null;

  try {
    const newPassword = validateStrongPassword(body?.newPassword);

    assertCsrfRequest(request);

    const authContext = await requirePolicySession(request, AUTH_ROUTE_POLICY_KEYS.PASSWORD_SET_COMPLETE);

    userId = authContext.userId;
    sessionJti = authContext.sessionJti || null;
    email = normalizeEmail(authContext.email);

    if (hasPasswordProvider(authContext.userRecord)) {
      throw new Error('Email/password sign-in is already linked to this account');
    }

    const stepUp = assertStepUp(request, {
      purpose: 'password-set',
      userId,
    });
    challengeJti = stepUp?.challengeJti || null;

    await enforceAuthRateLimit(AUTH_RATE_LIMIT_POLICY_KEYS.PASSWORD_SET_COMPLETE, {
      dimensionValues: {
        device: requestContext.deviceId,
        ip: requestContext.ipAddress,
        user: userId,
      },
    });

    await authContext.adminAuth.updateUser(userId, {
      appMetadata: {
        ...(authContext.userRecord?.app_metadata || {}),
        tvz_password_enabled: true,
      },
      password: newPassword,
    });
    await authContext.adminAuth.revokeRefreshTokens(userId);

    await writeAuthAuditLog({
      request,
      eventType: 'password-set',
      status: 'success',
      userId,
      email,
      provider: 'password',
      requestId: requestMeta.requestId,
      sessionJti,
      outcome: 'completed',
      metadata: {
        action: 'password-set-complete',
        challengeJti,
        csrfValid: true,
        sessionJti,
        source: ACTION_SOURCES[ACCOUNT_ACTIONS.SET_PASSWORD],
        stepUpPurpose: 'password-set',
      },
    }).catch((auditError) => {
      console.error('[AuthAudit] password-set success log failed:', auditError);
    });

    const response = createApiSuccessResponse(
      {
        messageCode: 'PASSWORD_SET',
        nextAction: 'signed_out',
      },
      {
        code: 'PASSWORD_SET',
        legacyPayload: {
          ok: true,
          nextAction: 'signed_out',
          messageCode: 'PASSWORD_SET',
        },
        requestMeta: {
          ...requestMeta,
          sessionId: sessionJti,
          userId,
        },
      }
    );
    clearAuthCookies(response, request);
    clearStepUpCookie(response);
    return response;
  } catch (error) {
    const message = String(error?.message || 'Password could not be set');
    const status = message.includes('Too many')
      ? 429
      : message.includes('Invalid CSRF token')
        ? 403
        : message.includes('already deleted')
          ? 410
          : message.includes('pending deletion')
            ? 409
            : message.includes('Authentication session is required') ||
                message.includes('Invalid or expired authentication token') ||
                message.includes('Authentication token has been revoked')
              ? 401
              : message.includes('already linked to this account')
                ? 409
                : message.includes('required') ||
                    message.includes('invalid') ||
                    message.includes('verification') ||
                    message.includes('must contain') ||
                    message.includes('at least')
                  ? 400
                  : 500;

    await writeAuthAuditLog({
      request,
      eventType: 'password-set',
      status: status === 429 ? 'blocked' : 'failure',
      userId,
      email,
      provider: 'password',
      requestId: requestMeta.requestId,
      sessionJti,
      outcome: status === 429 ? 'blocked' : 'failed',
      metadata: {
        action: 'password-set-complete',
        challengeJti,
        csrfValid: !message.includes('Invalid CSRF token'),
        message,
        sessionJti,
        source: ACTION_SOURCES[ACCOUNT_ACTIONS.SET_PASSWORD],
        stepUpPurpose: 'password-set',
      },
    }).catch((auditError) => {
      console.error('[AuthAudit] password-set failure log failed:', auditError);
    });

    return createApiErrorResponse(
      {
        code: status === 429 ? 'RATE_LIMITED' : 'PASSWORD_SET_FAILED',
        message,
        retryable: status >= 500,
      },
      {
        requestMeta: {
          ...requestMeta,
          sessionId: sessionJti,
          userId,
        },
        status,
      }
    );
  }
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const action = normalizeAction(body?.action);

  switch (action) {
    case ACCOUNT_ACTIONS.PASSWORD_STATUS:
      return handlePasswordStatus(request, body);
    case ACCOUNT_ACTIONS.REAUTHENTICATE:
      return handleReauthenticate(request, body);
    case ACCOUNT_ACTIONS.DELETE:
      return handleDeleteAccount(request, body);
    case ACCOUNT_ACTIONS.CHANGE_EMAIL:
      return handleChangeEmail(request, body);
    case ACCOUNT_ACTIONS.CHANGE_PASSWORD:
      return handleChangePassword(request, body);
    case ACCOUNT_ACTIONS.SET_PASSWORD:
      return handleSetPassword(request, body);
    default:
      return createApiErrorResponse(
        {
          code: 'INVALID_ACCOUNT_ACTION',
          message: action ? `Unsupported account action: ${action}` : 'action is required',
          retryable: false,
        },
        {
          requestMeta: buildRequestMeta(request, null),
          status: 400,
        }
      );
  }
}
