import { NextResponse } from 'next/server';

import {
  applySessionCookies,
  clearAuthCookies,
  createCsrfToken,
  getRequestContext,
  setDeviceIdCookie,
} from '@/core/auth/servers/session.js';
import { createPendingPasswordSignIn } from '@/core/auth/servers/security.js';
import {
  clearPendingSignInCookie,
  createPendingSignInToken,
  hasTrustedLoginDevice,
  isPasswordAccountUserNotFoundError,
  lookupPasswordAccountByEmail,
  resolvePasswordAccountIdentifier,
  setPendingSignInCookie,
  throwSignInLookupError,
} from '@/core/auth/servers/verification.js';
import { createSupabaseResponseClient } from '@/core/clients/supabase/response-client.server';

function normalizeValue(value) {
  return String(value || '').trim();
}

const DEV_SEED_LOGIN_VERIFICATION_BYPASS_EMAILS = new Set([
  'dev-seed-arda@tvizzie.local',
  'dev-seed-leo@tvizzie.local',
  'dev-seed-mina@tvizzie.local',
  'dev-seed-nora@tvizzie.local',
]);

function shouldBypassLoginVerificationForSeedUser(email) {
  return DEV_SEED_LOGIN_VERIFICATION_BYPASS_EMAILS.has(normalizeValue(email).toLowerCase());
}

async function createPasswordSignInResponse(request, requestContext, pendingSignIn) {
  const response = NextResponse.json({ success: true });
  const supabase = createSupabaseResponseClient(request, response);
  const sessionResult = await supabase.auth.setSession({
    access_token: pendingSignIn.accessToken,
    refresh_token: pendingSignIn.refreshToken,
  });

  if (sessionResult.error) {
    throw new Error(sessionResult.error.message || 'Sign in failed');
  }

  applySessionCookies(response, {
    csrfToken: createCsrfToken(),
  });
  clearPendingSignInCookie(response);
  setDeviceIdCookie(response, requestContext.deviceId);
  return response;
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const identifier = normalizeValue(body?.identifier || body?.email);
    const password = String(body?.password || '');

    if (!identifier || !password) {
      return NextResponse.json({ error: 'identifier and password are required' }, { status: 400 });
    }

    let email = null;

    try {
      email = (await resolvePasswordAccountIdentifier(identifier)).email;
    } catch (error) {
      if (isPasswordAccountUserNotFoundError(error)) {
        throwSignInLookupError('auth/user-not-found');
      }

      throw error;
    }

    const passwordLookup = await lookupPasswordAccountByEmail(email);

    if (!passwordLookup.eligible) {
      throwSignInLookupError(passwordLookup.code);
    }

    const requestContext = getRequestContext(request);
    const pendingSignIn = await createPendingPasswordSignIn({
      email,
      password,
    });

    if (
      hasTrustedLoginDevice(request, { deviceHash: requestContext.deviceHash, userId: pendingSignIn.userId }) ||
      shouldBypassLoginVerificationForSeedUser(pendingSignIn.email)
    ) {
      return createPasswordSignInResponse(request, requestContext, pendingSignIn);
    }

    const response = NextResponse.json({
      email: pendingSignIn.email,
      requiresVerification: true,
    });

    setPendingSignInCookie(
      response,
      createPendingSignInToken({
        accessToken: pendingSignIn.accessToken,
        deviceHash: requestContext.deviceHash,
        email: pendingSignIn.email,
        provider: pendingSignIn.provider,
        refreshToken: pendingSignIn.refreshToken,
        user: pendingSignIn.user,
        userId: pendingSignIn.userId,
      })
    );
    setDeviceIdCookie(response, requestContext.deviceId);
    return response;
  } catch (error) {
    const message = String(error?.message || 'Sign in failed');
    const code = normalizeValue(error?.code) || null;
    const status =
      message.includes('identifier and password are required') ||
      message.includes('Username or email is required') ||
      message.includes('Invalid login credentials') ||
      message.includes('email/password sign-in enabled')
        ? 400
        : 500;

    const response = NextResponse.json(
      {
        code,
        error: message,
      },
      { status }
    );

    if (status >= 500) {
      clearAuthCookies(response, request);
    }

    return response;
  }
}
