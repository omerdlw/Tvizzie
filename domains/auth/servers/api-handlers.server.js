import { NextResponse } from 'next/server';
import { normalizeEmailValue, normalizeValue } from '@/shared/utils';
import { createAdminClient } from '@/infrastructure/supabase/admin';
import { applySessionCookies, clearAuthCookies, createCsrfToken, getRequestContext, setDeviceIdCookie } from './session.server';
import { createPendingPasswordSignIn, enforceAuthRateLimit } from './security.server';
import {
  clearPendingSignInCookie,
  createPendingSignInToken,
  lookupPasswordAccountByEmail,
  requestVerificationCode,
  resolvePasswordAccountIdentifier,
  setPendingSignInCookie,
  verifyCodeRequest,
} from './verification.server';
import { createSignUpProofToken, verifyPasswordResetProofToken } from './proof-tokens.server';
import { ensurePasswordAccountRecord } from './account.server';

// ============================================================
// Sign-In Route Handler
// ============================================================

export async function handleSignInPost(request) {
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
      return NextResponse.json({ code: 'auth/user-not-found', error: 'No account found' }, { status: 400 });
    }

    const passwordLookup = await lookupPasswordAccountByEmail(email);
    if (!passwordLookup.eligible) {
      return NextResponse.json({ code: passwordLookup.code || 'invalid_credentials', error: 'Sign in failed' }, { status: 400 });
    }

    const requestContext = getRequestContext(request);
    const pendingSignIn = await createPendingPasswordSignIn({ email, password });

    const response = NextResponse.json({ success: true });
    applySessionCookies(response, { accessToken: pendingSignIn.accessToken, refreshToken: pendingSignIn.refreshToken });
    clearPendingSignInCookie(response);
    setDeviceIdCookie(response, requestContext.deviceId);
    return response;
  } catch (error) {
    const message = String(error?.message || 'Sign in failed');
    return NextResponse.json({ code: error?.code || null, error: message }, { status: 400 });
  }
}

// ============================================================
// Sign-Up Complete Route Handler
// ============================================================

export async function handleSignUpCompletePost(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmailValue(body?.email);
    const password = String(body?.password || '');
    const username = normalizeValue(body?.username);

    if (!email || !password || !username) {
      return NextResponse.json({ error: 'email, password, and username are required' }, { status: 400 });
    }

    const admin = createAdminClient();
    const createRes = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createRes.error || !createRes.data?.user?.id) {
      return NextResponse.json({ error: createRes.error?.message || 'Failed to create user' }, { status: 400 });
    }

    const userId = createRes.data.user.id;
    await ensurePasswordAccountRecord({ displayName: username, email, userId, username });

    return NextResponse.json({ success: true, userId });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Sign up failed' }, { status: 400 });
  }
}

// ============================================================
// Password Reset Complete Route Handler
// ============================================================

export async function handlePasswordResetCompletePost(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = normalizeValue(body?.token || body?.passwordResetProof);
    const newPassword = String(body?.newPassword || '');

    if (!token || !newPassword) {
      return NextResponse.json({ error: 'token and newPassword are required' }, { status: 400 });
    }

    const verified = verifyPasswordResetProofToken(token);
    const admin = createAdminClient();
    const updateRes = await admin.auth.admin.updateUserById(verified.userId, { password: newPassword });

    if (updateRes.error) throw updateRes.error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Password reset failed' }, { status: 400 });
  }
}

// ============================================================
// Verification Route Handler
// ============================================================

export async function handleVerificationPost(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = normalizeValue(body?.action);
    const email = normalizeEmailValue(body?.email);
    const code = normalizeValue(body?.code);
    const purpose = normalizeValue(body?.purpose || 'sign-in');

    if (action === 'send') {
      const result = await requestVerificationCode({ email, purpose });
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'verify') {
      const verified = await verifyCodeRequest({ code, email, purpose });
      return NextResponse.json({ success: true, ...verified });
    }

    return NextResponse.json({ error: 'Invalid verification action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Verification failed' }, { status: 400 });
  }
}

// ============================================================
// Session & Audit Route Handlers
// ============================================================

export async function handleSessionGet(request) {
  return NextResponse.json({ ok: true });
}

export async function handleAuditPost(request) {
  return NextResponse.json({ logged: true });
}
