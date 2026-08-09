import { NextResponse } from 'next/server';
import { normalizeEmailValue, normalizeValue } from '@/shared/utils';
import { createAdminClient } from '@/infrastructure/supabase/admin';
import {
  applySupabaseSessionToResponse,
  getRequestContext,
  readSessionFromRequest,
  revokeRefreshTokens,
  requireSessionRequest,
  setDeviceIdCookie,
} from './session.server';
import {
  AUTH_RATE_LIMIT_POLICY_KEYS,
  assertCsrfRequest,
  createPendingPasswordSignIn,
  createStepUpToken,
  enforceAuthRateLimit,
  setStepUpCookie,
  validateStrongPassword,
} from './security.server';
import {
  claimVerificationProof,
  completeVerificationProof,
  clearPendingSignInCookie,
  createPendingSignInToken,
  isDeviceTrusted,
  lookupPasswordAccountByEmail,
  lookupAccountByEmail,
  requestVerificationCode,
  releaseVerificationProof,
  resolvePasswordAccountIdentifier,
  setPendingSignInCookie,
  setTrustedDeviceCookie,
  verifyCodeRequest,
} from './verification.server';
import {
  createPasswordResetProofToken,
  createSignUpProofToken,
  verifyPasswordResetProofToken,
  verifySignUpProofToken,
} from './proof-tokens.server';
import { ensurePasswordAccountRecord } from './account.server';
import { resolvePrimaryProvider, SECURE_PURPOSES } from '@/domains/auth/utils';

// ============================================================
// Sign-In Route Handler
// ============================================================

export async function handleSignInPost(request) {
  try {
    assertCsrfRequest(request);
    const body = await request.json().catch(() => ({}));
    const identifier = normalizeValue(body?.identifier || body?.email);
    const password = String(body?.password || '');
    const signUpProof = normalizeValue(body?.signUpProof);

    if (!identifier || !password) {
      return NextResponse.json({ error: 'identifier and password are required' }, { status: 400 });
    }

    const requestContext = getRequestContext(request);
    await enforceAuthRateLimit(AUTH_RATE_LIMIT_POLICY_KEYS.SIGN_IN, {
      dimensionValues: {
        device: requestContext.deviceHash,
        email: identifier,
        ip: requestContext.ipHash,
      },
    });

    let email = null;
    try {
      email = (await resolvePasswordAccountIdentifier(identifier)).email;
    } catch {
      return NextResponse.json(
        { code: 'invalid_credentials', error: 'Sign in failed' },
        { status: 400 },
      );
    }

    const passwordLookup = await lookupPasswordAccountByEmail(email);
    if (!passwordLookup.eligible) {
      return NextResponse.json(
        { code: passwordLookup.code || 'invalid_credentials', error: 'Sign in failed' },
        { status: 400 },
      );
    }

    const pendingSignIn = await createPendingPasswordSignIn({ email, password });
    let isTrusted = isDeviceTrusted(request, {
      userId: pendingSignIn.userId,
      deviceId: requestContext.deviceId,
    });

    if (!isTrusted && signUpProof) {
      try {
        verifySignUpProofToken(signUpProof, { email });
        isTrusted = true;
      } catch {}
    }

    if (!isTrusted) {
      await requestVerificationCode({
        email,
        purpose: 'sign-in',
        userId: pendingSignIn.userId,
        deviceId: requestContext.deviceId,
      });

      const pendingToken = createPendingSignInToken({
        accessToken: pendingSignIn.accessToken,
        deviceHash: requestContext.deviceHash,
        email,
        refreshToken: pendingSignIn.refreshToken,
        user: pendingSignIn.user || null,
        userId: pendingSignIn.userId,
      });

      const response = NextResponse.json({
        requiresVerification: true,
        email,
      });
      setPendingSignInCookie(response, pendingToken);
      setDeviceIdCookie(response, requestContext.deviceId);
      return response;
    }

    const response = NextResponse.json({ success: true });
    await applySupabaseSessionToResponse(request, response, {
      accessToken: pendingSignIn.accessToken,
      refreshToken: pendingSignIn.refreshToken,
    });
    setTrustedDeviceCookie(response, {
      userId: pendingSignIn.userId,
      deviceId: requestContext.deviceId,
    });
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
  let claimedProofKey = null;
  let createdUserId = null;
  try {
    assertCsrfRequest(request);
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmailValue(body?.email);
    const password = String(body?.password || '');
    const signUpProof = normalizeValue(body?.signUpProof);
    const username = normalizeValue(body?.username);

    if (!email || !password || !signUpProof || !username) {
      return NextResponse.json(
        { error: 'email, password, signUpProof, and username are required' },
        { status: 400 },
      );
    }

    const verifiedProof = verifySignUpProofToken(signUpProof, { email });
    const requestContext = getRequestContext(request);
    await enforceAuthRateLimit(AUTH_RATE_LIMIT_POLICY_KEYS.SIGN_UP_COMPLETE, {
      dimensionValues: {
        device: requestContext.deviceHash,
        email,
        ip: requestContext.ipHash,
      },
    });
    validateStrongPassword(password);
    claimedProofKey = await claimVerificationProof({
      ...verifiedProof,
      email,
      purpose: 'sign-up',
    });

    const admin = createAdminClient();
    const createRes = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createRes.error || !createRes.data?.user?.id) {
      return NextResponse.json(
        { error: createRes.error?.message || 'Failed to create user' },
        { status: 400 },
      );
    }

    const userId = createRes.data.user.id;
    createdUserId = userId;
    await ensurePasswordAccountRecord({ displayName: username, email, userId, username });
    await completeVerificationProof(claimedProofKey);
    claimedProofKey = null;

    return NextResponse.json({ success: true, userId });
  } catch (error) {
    if (createdUserId) {
      await createAdminClient()
        .auth.admin.deleteUser(createdUserId)
        .catch(() => null);
    }
    if (claimedProofKey) {
      await releaseVerificationProof(claimedProofKey).catch(() => null);
    }
    return NextResponse.json({ error: error.message || 'Sign up failed' }, { status: 400 });
  }
}

// ============================================================
// Password Reset Complete Route Handler
// ============================================================

export async function handlePasswordResetCompletePost(request) {
  let claimedProofKey = null;
  try {
    assertCsrfRequest(request);
    const body = await request.json().catch(() => ({}));
    const token = normalizeValue(body?.token || body?.passwordResetProof);
    const newPassword = String(body?.newPassword || '');

    if (!token || !newPassword) {
      return NextResponse.json({ error: 'token and newPassword are required' }, { status: 400 });
    }

    const verified = verifyPasswordResetProofToken(token);
    if (!verified.userId) throw new Error('Password reset verification is invalid');
    const requestContext = getRequestContext(request);
    await enforceAuthRateLimit(AUTH_RATE_LIMIT_POLICY_KEYS.PASSWORD_RESET_COMPLETE, {
      dimensionValues: {
        device: requestContext.deviceHash,
        email: verified.email,
        ip: requestContext.ipHash,
      },
    });
    const password = validateStrongPassword(newPassword);
    claimedProofKey = await claimVerificationProof({
      ...verified,
      purpose: 'password-reset',
    });
    const admin = createAdminClient();
    const updateRes = await admin.auth.admin.updateUserById(verified.userId, {
      password,
    });

    if (updateRes.error) throw updateRes.error;
    await revokeRefreshTokens(verified.userId, { reason: 'password-reset' });
    await completeVerificationProof(claimedProofKey);
    claimedProofKey = null;

    return NextResponse.json({ success: true });
  } catch (error) {
    if (claimedProofKey) {
      await releaseVerificationProof(claimedProofKey).catch(() => null);
    }
    return NextResponse.json({ error: error.message || 'Password reset failed' }, { status: 400 });
  }
}

// ============================================================
// Verification Route Handler
// ============================================================

export async function handleVerificationPost(request) {
  try {
    assertCsrfRequest(request);
    const body = await request.json().catch(() => ({}));
    const action = normalizeValue(body?.action);
    const email = normalizeEmailValue(body?.email);
    const code = normalizeValue(body?.code);
    const purpose = normalizeValue(body?.purpose || 'sign-in');
    const rememberDevice = body?.rememberDevice === true;
    const requestContext = getRequestContext(request);
    const normalizedPurpose = purpose.toLowerCase();
    const requiresAuthenticatedStepUp = SECURE_PURPOSES.has(normalizedPurpose);
    let stepUpSession = null;

    if (requiresAuthenticatedStepUp) {
      stepUpSession = await requireSessionRequest(request, { allowBearerFallback: false });
      if (normalizeEmailValue(stepUpSession.email) !== email) {
        throw new Error('Verification email does not match the authenticated account');
      }
    }

    if (action === 'send') {
      if (normalizedPurpose === 'sign-up') {
        const lookup = await lookupAccountByEmail(email);
        if (lookup.exists) {
          const oauthProvider = !lookup.supportsPasswordAuth
            ? resolvePrimaryProvider(lookup.providerIds)
            : null;
          const error = new Error(
            oauthProvider
              ? `This email is already registered with ${oauthProvider}. Continue with ${oauthProvider} sign-in, then set a password from Account Settings.`
              : 'This email is already registered',
          );
          error.code = oauthProvider
            ? 'OAUTH_ACCOUNT_ALREADY_REGISTERED'
            : 'AUTH_ACCOUNT_ALREADY_REGISTERED';
          error.data = { email, needsPasswordSetup: Boolean(oauthProvider), provider: oauthProvider };
          throw error;
        }
      }

      await enforceAuthRateLimit(AUTH_RATE_LIMIT_POLICY_KEYS.VERIFICATION_SEND, {
        dimensionValues: {
          device: requestContext.deviceHash,
          email,
          ip: requestContext.ipHash,
        },
      });
      const result = await requestVerificationCode({
        deviceId: requestContext.deviceId,
        email,
        forceNew: body?.forceNew === true,
        ipAddress: requestContext.ipAddress,
        purpose,
        userId: stepUpSession?.userId || undefined,
      });
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'verify') {
      await enforceAuthRateLimit(AUTH_RATE_LIMIT_POLICY_KEYS.VERIFICATION_VERIFY, {
        dimensionValues: {
          device: requestContext.deviceHash,
          email,
          ip: requestContext.ipHash,
        },
      });

      let pendingSignIn = null;
      if (String(purpose).toLowerCase() === 'sign-in') {
        const pendingToken = request.cookies.get('tvz_login_pending')?.value;
        if (!pendingToken)
          throw new Error('Verification session has expired. Please sign in again.');
        pendingSignIn = verifyPendingSignInToken(pendingToken);
        if (
          normalizeEmailValue(pendingSignIn.email) !== email ||
          pendingSignIn.deviceHash !== requestContext.deviceHash
        ) {
          throw new Error('Verification session does not match this device');
        }
      }

      const verified = await verifyCodeRequest({
        code,
        email,
        purpose,
        userId: stepUpSession?.userId || undefined,
      });
      const result = { success: true, ...verified };
      const normPurpose = String(purpose || '')
        .trim()
        .toLowerCase();

      if (SECURE_PURPOSES.has(normPurpose)) {
        const response = NextResponse.json(result);
        setStepUpCookie(
          response,
          createStepUpToken({
            challengeJti: verified.challengeJti,
            email: stepUpSession.email,
            purpose: normPurpose,
            userId: stepUpSession.userId,
          }),
        );
        return response;
      }

      if (normPurpose === 'sign-up') {
        result.signUpProof = createSignUpProofToken({
          challengeJti: verified.challengeJti,
          challengeKey: verified.challengeKey,
          email: verified.email,
          userId: verified.userId,
        });
      } else if (normPurpose === 'password-reset') {
        result.passwordResetProof = createPasswordResetProofToken({
          challengeJti: verified.challengeJti,
          challengeKey: verified.challengeKey,
          email: verified.email,
          userId: verified.userId,
        });
      } else if (normPurpose === 'sign-in' && pendingSignIn) {
        const response = NextResponse.json({
          ...result,
          session: { user: pendingSignIn.user || null },
        });
        await applySupabaseSessionToResponse(request, response, {
          accessToken: pendingSignIn.accessToken,
          refreshToken: pendingSignIn.refreshToken,
        });
        if (rememberDevice) {
          setTrustedDeviceCookie(response, {
            userId: pendingSignIn.userId,
            deviceId: requestContext.deviceId,
          });
        }
        clearPendingSignInCookie(response);
        setDeviceIdCookie(response, requestContext.deviceId);
        return response;
      }

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid verification action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        code: error?.code || null,
        data: error?.data || null,
        error: error.message || 'Verification failed',
      },
      { status: 400 },
    );
  }
}

// ============================================================
// Session & Audit Route Handlers
// ============================================================

export async function handleSessionGet(request) {
  try {
    const sessionContext = await readSessionFromRequest(request, {
      skipSupabaseFallbackIfNoHint: false,
      skipSupabaseFallback: false,
    });

    if (sessionContext?.userId) {
      return NextResponse.json({
        status: 'authenticated',
        expiresAt: sessionContext.decodedToken?.exp ? sessionContext.decodedToken.exp * 1000 : null,
        user: {
          id: sessionContext.userId,
          email: sessionContext.email || null,
          metadata:
            sessionContext.decodedToken?.user_metadata || sessionContext.user?.user_metadata || {},
          app_metadata:
            sessionContext.decodedToken?.app_metadata || sessionContext.user?.app_metadata || {},
        },
        capabilities: {
          providerIds: sessionContext.decodedToken?.amr || [],
          primaryProvider: sessionContext.decodedToken?.app_metadata?.provider || 'email',
        },
      });
    }

    return NextResponse.json({
      status: 'anonymous',
      user: null,
    });
  } catch {
    return NextResponse.json({
      status: 'anonymous',
      user: null,
    });
  }
}

export async function handleAuditPost(request) {
  return NextResponse.json({ logged: true });
}
