import { assertPasswordProviderLinked } from '@/core/auth/servers/account/account-deletion.server';
import { writeAuthAuditLog } from '@/core/auth/servers/audit/audit-log.server';
import { AUTH_ROUTE_POLICY_KEYS, requirePolicySession } from '@/core/auth/servers/policy/auth-route-policy.server';
import { assertCsrfRequest } from '@/core/auth/servers/security/csrf.server';
import {
  validateStrongPassword,
  verifyPasswordWithIdentityToolkit,
} from '@/core/auth/servers/security/password-security.server';
import {
  AUTH_RATE_LIMIT_POLICY_KEYS,
  enforceAuthRateLimit,
} from '@/core/auth/servers/security/rate-limit-policies.server';
import { getRequestContext } from '@/core/auth/servers/session/request-context.server';
import { clearAuthCookies } from '@/core/auth/servers/session/session.server';
import { assertRecentReauth, clearRecentReauthCookie } from '@/core/auth/servers/security/recent-reauth.server';
import { assertStepUp, clearStepUpCookie } from '@/core/auth/servers/security/step-up.server';
import { createApiErrorResponse, createApiSuccessResponse } from '@/core/services/shared/api-response.server';
import { buildInternalRequestMeta } from '@/core/services/shared/request-meta.server';

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function normalizePassword(value) {
  return String(value || '');
}

export async function POST(request) {
  const requestContext = getRequestContext(request);
  const requestMeta = buildInternalRequestMeta({
    request,
    source: 'api/auth/account/change-password',
  });
  let email = null;
  let userId = null;
  let challengeJti = null;
  let sessionJti = null;

  try {
    const body = await request.json().catch(() => ({}));
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
        source: 'api/auth/account/change-password',
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
        source: 'api/auth/account/change-password',
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
        source: 'api/auth/account/change-password',
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
