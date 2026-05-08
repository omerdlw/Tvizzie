import { NextResponse } from 'next/server';

import { hasPasswordProvider } from '@/core/auth/servers/account/account-deletion.server';
import { writeAuthAuditLog } from '@/core/auth/servers/audit/audit-log.server';
import { AUTH_ROUTE_POLICY_KEYS, getAuthRoutePolicy } from '@/core/auth/servers/policy/auth-route-policy.server';
import { validateStrongPassword } from '@/core/auth/servers/security/password-security.server';
import { verifyPasswordResetProofToken } from '@/core/auth/servers/verification/password-reset-proof.server';
import {
  AUTH_RATE_LIMIT_POLICY_KEYS,
  enforceAuthRateLimit,
} from '@/core/auth/servers/security/rate-limit-policies.server';
import { getRequestContext } from '@/core/auth/servers/session/request-context.server';
import { clearAuthCookies } from '@/core/auth/servers/session/session.server';
import { createAdminAuthFacade } from '@/core/auth/servers/session/supabase-admin-auth.server';
import { clearStepUpCookie } from '@/core/auth/servers/security/step-up.server';
import { AUTH_CHALLENGE_TABLE } from '@/core/auth/auth.constants';
import { createAdminClient } from '@/core/clients/supabase/admin';

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

async function assertPasswordResetTargetIntegrity({ userRecord, email }) {
  const userId = String(userRecord?.uid || '').trim();

  if (!userId) {
    throw new Error('No account found with this email address');
  }

  const profileResult = await createAdminClient().from('profiles').select('id, email').eq('id', userId).maybeSingle();

  if (profileResult.error) {
    throw new Error(profileResult.error.message || 'No account found with this email address');
  }

  if (!profileResult.data) {
    throw new Error('No account found with this email address');
  }

  const profileData = profileResult.data || {};
  const profileEmail = normalizeEmail(profileData?.email);
  const profileId = String(profileData?.id || '').trim();

  if (profileEmail !== email || (profileId && profileId !== userId)) {
    throw new Error('No account found with this email address');
  }
}

export async function POST(request) {
  const requestContext = getRequestContext(request);
  const routePolicy = getAuthRoutePolicy(AUTH_ROUTE_POLICY_KEYS.PASSWORD_RESET_COMPLETE);
  let email = null;
  let userId = null;

  try {
    const body = await request.json();
    const passwordResetProof = String(body?.passwordResetProof || '').trim();
    email = normalizeEmail(body?.email);
    const newPassword = validateStrongPassword(body?.newPassword);

    if (!passwordResetProof || !email) {
      return NextResponse.json({ error: 'passwordResetProof, email, and newPassword are required' }, { status: 400 });
    }

    await enforceAuthRateLimit(AUTH_RATE_LIMIT_POLICY_KEYS.PASSWORD_RESET_COMPLETE, {
      dimensionValues: {
        device: requestContext.deviceId,
        email,
        ip: requestContext.ipAddress,
      },
    });

    const adminAuth = createAdminAuthFacade();
    const admin = createAdminClient();
    const passwordResetVerification = verifyPasswordResetProofToken(passwordResetProof, { email });
    const userRecord = await adminAuth.getUserByEmail(email);
    if (!hasPasswordProvider(userRecord)) {
      throw new Error('No account found with this email address');
    }

    await assertPasswordResetTargetIntegrity({
      userRecord,
      email,
    });

    userId = userRecord.uid;
    const challengeResult = await admin
      .from(AUTH_CHALLENGE_TABLE)
      .select('purpose, status, jti, password_reset_completed_at')
      .eq('challenge_key', passwordResetVerification.challengeKey)
      .maybeSingle();

    if (challengeResult.error) {
      throw new Error(challengeResult.error.message || 'Password reset verification has expired');
    }

    const challenge = challengeResult.data || null;

    if (!challenge) {
      throw new Error('Password reset verification has expired');
    }

    if (
      String(challenge?.purpose || '').trim() !== 'password-reset' ||
      String(challenge?.status || '').trim() !== 'used' ||
      String(challenge?.jti || '').trim() !== passwordResetVerification.challengeJti
    ) {
      throw new Error('Password reset verification is invalid');
    }

    if (challenge?.password_reset_completed_at) {
      throw new Error('Password reset verification has already been used');
    }

    const challengeUpdate = await admin
      .from(AUTH_CHALLENGE_TABLE)
      .update({
        password_reset_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('challenge_key', passwordResetVerification.challengeKey);

    if (challengeUpdate.error) {
      throw new Error(challengeUpdate.error.message || 'Password reset verification could not be updated');
    }

    await adminAuth.updateUser(userRecord.uid, {
      appMetadata: {
        ...(userRecord?.app_metadata || {}),
        tvz_password_enabled: true,
      },
      password: newPassword,
    });

    await adminAuth.revokeRefreshTokens(userRecord.uid);

    await writeAuthAuditLog({
      request,
      eventType: 'password-reset',
      status: 'success',
      userId,
      email,
      provider: 'password',
      metadata: {
        action: 'password-reset-complete',
        authRoute: routePolicy.route,
        source: 'api/auth/password-reset/complete',
      },
    }).catch((auditError) => {
      console.error('[AuthAudit] password-reset success log failed:', auditError);
    });

    const response = NextResponse.json({
      ok: true,
      nextAction: 'signed_out',
      messageCode: 'PASSWORD_RESET_COMPLETED',
    });
    clearAuthCookies(response, request);
    clearStepUpCookie(response);
    return response;
  } catch (error) {
    const message = String(error?.message || 'Password reset could not be completed');
    const status = message.includes('Too many')
      ? 429
      : message.includes('required') ||
          message.includes('invalid') ||
          message.includes('expired') ||
          message.includes('already been used') ||
          message.includes('must be') ||
          message.includes('verification')
        ? 400
        : message.includes('auth/user-not-found')
          ? 404
          : 500;

    await writeAuthAuditLog({
      request,
      eventType: 'password-reset',
      status: status === 429 ? 'blocked' : 'failure',
      userId,
      email,
      provider: 'password',
      metadata: {
        action: 'password-reset-complete',
        authRoute: routePolicy.route,
        message,
        source: 'api/auth/password-reset/complete',
        status,
      },
    }).catch((auditError) => {
      console.error('[AuthAudit] password-reset failure log failed:', auditError);
    });

    await writeAuthAuditLog({
      request,
      eventType: 'failed-attempt',
      status: status === 429 ? 'blocked' : 'failure',
      userId,
      email,
      provider: 'password',
      metadata: {
        action: 'password-reset-complete',
        authRoute: routePolicy.route,
        message,
        source: 'api/auth/password-reset/complete',
        status,
      },
    }).catch((auditError) => {
      console.error('[AuthAudit] failed-attempt log failed:', auditError);
    });

    return NextResponse.json({ error: message }, { status });
  }
}
