import { NextResponse } from 'next/server';

import { assertPasswordProviderLinked } from '@/core/auth/servers/account/account-deletion.server';
import { writeAuthAuditLog } from '@/core/auth/servers/audit/audit-log.server';
import { requireSessionRequest } from '@/core/auth/servers/session/authenticated-request.server';
import { assertCsrfRequest } from '@/core/auth/servers/security/csrf.server';
import {
  validateStrongPassword,
  verifyPasswordWithIdentityToolkit,
} from '@/core/auth/servers/security/password-security.server';
import {
  enforceSlidingWindowRateLimit,
  isSlidingWindowRateLimitError,
} from '@/core/auth/servers/security/rate-limit.server';
import { getRequestContext } from '@/core/auth/servers/session/request-context.server';
import { clearAuthCookies } from '@/core/auth/servers/session/session.server';
import { assertRecentReauth, clearRecentReauthCookie } from '@/core/auth/servers/security/recent-reauth.server';
import { assertStepUp, clearStepUpCookie } from '@/core/auth/servers/security/step-up.server';

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function normalizePassword(value) {
  return String(value || '');
}

async function enforcePasswordChangeRateLimit({ userId, requestContext }) {
  try {
    await enforceSlidingWindowRateLimit({
      namespace: 'auth:password-change:complete',
      windowMs: 15 * 60 * 1000,
      dimensions: [
        { id: 'user', value: userId, limit: 8 },
        { id: 'ip', value: requestContext.ipAddress, limit: 20 },
        { id: 'device', value: requestContext.deviceId, limit: 12 },
      ],
      message: 'Too many password change attempts',
    });
  } catch (error) {
    if (!isSlidingWindowRateLimitError(error)) {
      throw error;
    }

    if (error.dimension === 'user') {
      throw new Error('Too many password change attempts for this account');
    }

    if (error.dimension === 'device') {
      throw new Error('Too many password change attempts from this device');
    }

    throw new Error('Too many password change attempts from this network');
  }
}

export async function POST(request) {
  const requestContext = getRequestContext(request);
  let email = null;
  let userId = null;
  let challengeJti = null;
  let sessionJti = null;

  try {
    const body = await request.json().catch(() => ({}));
    const currentPassword = normalizePassword(body?.currentPassword);
    const newPassword = validateStrongPassword(body?.newPassword);

    if (!currentPassword) {
      return NextResponse.json({ error: 'currentPassword is required' }, { status: 400 });
    }

    assertCsrfRequest(request);

    const authContext = await requireSessionRequest(request, {
      allowBearerFallback: true,
    });

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

    await enforcePasswordChangeRateLimit({
      requestContext,
      userId,
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

    const response = NextResponse.json({
      ok: true,
      nextAction: 'signed_out',
      messageCode: 'PASSWORD_CHANGED',
    });
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

    return NextResponse.json({ error: message }, { status });
  }
}
