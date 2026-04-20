import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/core/clients/supabase/constants';
import {
  lookupPasswordAccountByEmail,
  resolvePasswordAccountIdentifier,
} from '@/core/auth/servers/verification/password-account.server';
import { createPendingPasswordSignIn } from '@/core/auth/servers/security/password-security.server';
import { applySessionCookies, clearAuthCookies, createCsrfToken } from '@/core/auth/servers/session/session.server';
import { getRequestContext, setDeviceIdCookie } from '@/core/auth/servers/session/request-context.server';
import {
  clearPendingSignInCookie,
  createPendingSignInToken,
  hasTrustedLoginDevice,
  setPendingSignInCookie,
} from '@/core/auth/servers/verification/login-verification.server';

function normalizeValue(value) {
  return String(value || '').trim();
}

function createResponseClient(request, response) {
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });
}

function resolvePasswordAccountLookupError(code) {
  if (code === 'auth/user-not-found') {
    const error = new Error('Invalid login credentials');
    error.code = 'invalid_login_credentials';
    throw error;
  }

  if (code === 'auth/password-sign-in-disabled') {
    throw new Error('This account does not have email/password sign-in enabled');
  }

  throw new Error('Sign in failed');
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
      if (normalizeValue(error?.code) === 'auth/user-not-found') {
        resolvePasswordAccountLookupError('auth/user-not-found');
      }

      throw error;
    }

    const passwordLookup = await lookupPasswordAccountByEmail(email);

    if (!passwordLookup.eligible) {
      resolvePasswordAccountLookupError(passwordLookup.code);
    }

    const requestContext = getRequestContext(request);
    const pendingSignIn = await createPendingPasswordSignIn({
      email,
      password,
    });

    if (hasTrustedLoginDevice(request, { deviceHash: requestContext.deviceHash, userId: pendingSignIn.userId })) {
      const response = NextResponse.json({ success: true });
      const supabase = createResponseClient(request, response);
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
