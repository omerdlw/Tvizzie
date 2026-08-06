'use server';

import { cookies } from 'next/headers';
import { normalizeValue } from '@/shared/utils';
import { applySessionCookies, clearPendingSignInCookie } from '../server/session.server';
import { createPendingPasswordSignIn } from '../server/security.server';
import { lookupPasswordAccountByEmail, resolvePasswordAccountIdentifier } from '../server/verification.server';

export async function signInServer({ identifier, password }) {
  try {
    const normIdentifier = normalizeValue(identifier);
    const normPassword = String(password || '');

    if (!normIdentifier || !normPassword) {
      return { success: false, error: 'identifier and password are required' };
    }

    let email = null;
    try {
      email = (await resolvePasswordAccountIdentifier(normIdentifier)).email;
    } catch {
      return { success: false, code: 'auth/user-not-found', error: 'No account found' };
    }

    const passwordLookup = await lookupPasswordAccountByEmail(email);
    if (!passwordLookup.eligible) {
      return { success: false, code: passwordLookup.code || 'invalid_credentials', error: 'Sign in failed' };
    }

    const pendingSignIn = await createPendingPasswordSignIn({ email, password: normPassword });
    const cookieStore = await cookies();

    if (pendingSignIn.accessToken) {
      cookieStore.set('sb-access-token', pendingSignIn.accessToken, {
        httpOnly: true,
        maxAge: 604800,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }
    if (pendingSignIn.refreshToken) {
      cookieStore.set('sb-refresh-token', pendingSignIn.refreshToken, {
        httpOnly: true,
        maxAge: 604800,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }

    return { success: true };
  } catch (error) {
    return { success: false, code: error?.code || null, error: error?.message || 'Sign in failed' };
  }
}
