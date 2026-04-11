import { assertPasswordProviderLinked, hasPasswordProvider } from '@/core/auth/servers/account/account-deletion.server';
import {
  ACCOUNT_LIFECYCLE_STATES,
  abortAccountDeleteLifecycle,
  beginAccountDeleteLifecycle,
  completeAccountDeleteLifecycle,
} from '@/core/auth/servers/account/account-lifecycle.server';
import { writeAuthAuditLog } from '@/core/auth/servers/audit/audit-log.server';
import { AUTH_ROUTE_POLICY_KEYS, requirePolicySession } from '@/core/auth/servers/policy/auth-route-policy.server';
import { assertCsrfRequest } from '@/core/auth/servers/security/csrf.server';
import { verifyPasswordWithIdentityToolkit } from '@/core/auth/servers/security/password-security.server';
import { AUTH_RATE_LIMIT_POLICY_KEYS, enforceAuthRateLimit } from '@/core/auth/servers/security/rate-limit-policies.server';
import { getRequestContext } from '@/core/auth/servers/session/request-context.server';
import { clearAuthCookies } from '@/core/auth/servers/session/session.server';
import { assertStepUp, clearStepUpCookie } from '@/core/auth/servers/security/step-up.server';
import { createApiErrorResponse, createApiSuccessResponse } from '@/core/services/shared/api-response.server';
import { buildInternalRequestMeta } from '@/core/services/shared/request-meta.server';
import { invokeInternalEdgeFunction } from '@/core/services/shared/supabase-edge-internal.server';

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function normalizePassword(value) {
  return String(value || '');
}

function resolveDeleteErrorMessage(error) {
  const rawMessage = String(error?.message || '').trim();
  const errorCode = String(error?.code || '').trim();

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

export async function POST(request) {
  const requestContext = getRequestContext(request);
  const requestMeta = buildInternalRequestMeta({
    request,
    source: 'api/auth/account/delete',
  });
  let userId = null;
  let email = null;
  let challengeJti = null;
  let sessionJti = null;
  let auditProvider = 'password';
  let deleteLifecycleStarted = false;
  let deleteLifecycleState = ACCOUNT_LIFECYCLE_STATES.ACTIVE;

  try {
    const body = await request.json().catch(() => ({}));
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
          source: 'api/auth/account/delete',
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
        source: 'api/auth/account/delete',
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
        source: 'api/auth/account/delete',
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
        source: 'api/auth/account/delete',
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
