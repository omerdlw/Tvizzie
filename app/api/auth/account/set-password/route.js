import { hasPasswordProvider } from '@/core/auth/servers/account/account-deletion.server';
import { writeAuthAuditLog } from '@/core/auth/servers/audit/audit-log.server';
import { AUTH_ROUTE_POLICY_KEYS, requirePolicySession } from '@/core/auth/servers/policy/auth-route-policy.server';
import { assertCsrfRequest } from '@/core/auth/servers/security/csrf.server';
import { validateStrongPassword } from '@/core/auth/servers/security/password-security.server';
import {
  AUTH_RATE_LIMIT_POLICY_KEYS,
  enforceAuthRateLimit,
} from '@/core/auth/servers/security/rate-limit-policies.server';
import { getRequestContext } from '@/core/auth/servers/session/request-context.server';
import { clearAuthCookies } from '@/core/auth/servers/session/session.server';
import { assertStepUp, clearStepUpCookie } from '@/core/auth/servers/security/step-up.server';
import { createApiErrorResponse, createApiSuccessResponse } from '@/core/services/shared/api-response.server';
import { buildInternalRequestMeta } from '@/core/services/shared/request-meta.server';

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export async function POST(request) {
  const requestContext = getRequestContext(request);
  const requestMeta = buildInternalRequestMeta({
    request,
    source: 'api/auth/account/set-password',
  });
  let email = null;
  let userId = null;
  let challengeJti = null;
  let sessionJti = null;

  try {
    const body = await request.json().catch(() => ({}));
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
        source: 'api/auth/account/set-password',
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
        source: 'api/auth/account/set-password',
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
