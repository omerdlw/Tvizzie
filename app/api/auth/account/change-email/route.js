import { NextResponse } from 'next/server';

import { writeAuthAuditLog } from '@/core/auth/servers/audit/audit-log.server';
import { requireSessionRequest } from '@/core/auth/servers/session/authenticated-request.server';
import { assertCsrfRequest } from '@/core/auth/servers/security/csrf.server';
import {
  enforceSlidingWindowRateLimit,
  isSlidingWindowRateLimitError,
} from '@/core/auth/servers/security/rate-limit.server';
import { clearAuthCookies } from '@/core/auth/servers/session/session.server';
import { getRequestContext } from '@/core/auth/servers/session/request-context.server';
import { clearStepUpCookie, assertStepUp } from '@/core/auth/servers/security/step-up.server';
import { createAdminClient } from '@/core/clients/supabase/admin';
import { invokeInternalEdgeFunction } from '@/core/services/shared/supabase-edge-internal.server';
import { assertRecentReauth, clearRecentReauthCookie } from '@/core/auth/servers/security/recent-reauth.server';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

async function syncProfileEmail({ userId, email }) {
  const normalizedUserId = String(userId || '').trim();
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedUserId) {
    throw new Error('Authenticated user is required');
  }

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Enter a valid email address');
  }

  const result = await invokeInternalEdgeFunction('account-profile-write', {
    body: {
      action: 'sync-email',
      email: normalizedEmail,
      userId: normalizedUserId,
    },
  });

  if (result?.ok !== true) {
    throw new Error('Profile email could not be synced');
  }
}

async function rollbackEmailChange({ adminAuth, userId, previousEmail }) {
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

async function enforceEmailChangeRateLimit({ userId, requestContext }) {
  try {
    await enforceSlidingWindowRateLimit({
      namespace: 'auth:email-change:complete',
      windowMs: 15 * 60 * 1000,
      dimensions: [
        { id: 'user', value: userId, limit: 8 },
        { id: 'ip', value: requestContext.ipAddress, limit: 20 },
        { id: 'device', value: requestContext.deviceId, limit: 12 },
      ],
      message: 'Too many email change attempts',
    });
  } catch (error) {
    if (!isSlidingWindowRateLimitError(error)) {
      throw error;
    }

    if (error.dimension === 'user') {
      throw new Error('Too many email change attempts for this account');
    }

    if (error.dimension === 'device') {
      throw new Error('Too many email change attempts from this device');
    }

    throw new Error('Too many email change attempts from this network');
  }
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
      return NextResponse.json({ error: 'newEmail must be a valid email address' }, { status: 400 });
    }

    assertCsrfRequest(request);

    const authContext = await requireSessionRequest(request, {
      allowBearerFallback: true,
    });

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
      return NextResponse.json({ error: 'New email must be different from current email' }, { status: 400 });
    }

    await enforceEmailChangeRateLimit({
      userId,
      requestContext,
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
      });
    } catch (mutationError) {
      if (emailUpdated) {
        await rollbackEmailChange({
          adminAuth: authContext.adminAuth,
          previousEmail,
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

    const response = NextResponse.json({
      ok: true,
      nextAction: 'signed_out',
      messageCode: 'EMAIL_CHANGED',
      email: nextEmail,
    });
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

    return NextResponse.json({ error: message }, { status });
  }
}
