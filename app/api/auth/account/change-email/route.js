import { writeAuthAuditLog } from '@/core/auth/servers/audit/audit-log.server';
import { AUTH_ROUTE_POLICY_KEYS, requirePolicySession } from '@/core/auth/servers/policy/auth-route-policy.server';
import { assertCsrfRequest } from '@/core/auth/servers/security/csrf.server';
import {
  AUTH_RATE_LIMIT_POLICY_KEYS,
  enforceAuthRateLimit,
} from '@/core/auth/servers/security/rate-limit-policies.server';
import { clearAuthCookies } from '@/core/auth/servers/session/session.server';
import { getRequestContext } from '@/core/auth/servers/session/request-context.server';
import { clearStepUpCookie, assertStepUp } from '@/core/auth/servers/security/step-up.server';
import { createAdminClient } from '@/core/clients/supabase/admin';
import { ACCOUNT_WRITE_FUNCTION } from '@/core/services/account/contracts';
import { invokeInternalEdgeFunction } from '@/core/services/shared/supabase-edge-internal.server';
import { assertRecentReauth, clearRecentReauthCookie } from '@/core/auth/servers/security/recent-reauth.server';
import { createApiErrorResponse, createApiSuccessResponse } from '@/core/services/shared/api-response.server';
import { buildInternalRequestMeta } from '@/core/services/shared/request-meta.server';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

async function syncProfileEmail({ userId, email, request = null, requestMeta = null }) {
  const normalizedUserId = String(userId || '').trim();
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
  const normalizedAccessToken = String(accessToken || '').trim();

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
    if (String(error?.code || '').trim() === 'auth/user-not-found') {
      return;
    }

    throw error;
  }
}

export async function POST(request) {
  const requestContext = getRequestContext(request);
  const requestMeta = buildInternalRequestMeta({
    request,
    source: 'api/auth/account/change-email',
  });
  let userId = null;
  let previousEmail = null;
  let nextEmail = null;
  let challengeJti = null;
  let sessionJti = null;
  let serverSessionRevocationFailed = false;

  try {
    const body = await request.json().catch(() => ({}));
    nextEmail = normalizeEmail(body?.newEmail);

    if (!nextEmail || !EMAIL_PATTERN.test(nextEmail)) {
      return createApiErrorResponse(
        {
          code: 'VALIDATION_ERROR',
          message: 'newEmail must be a valid email address',
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
        source: 'api/auth/account/change-email',
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
        source: 'api/auth/account/change-email',
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
        source: 'api/auth/account/change-email',
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
