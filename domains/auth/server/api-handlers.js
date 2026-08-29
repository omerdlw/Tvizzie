import { NextResponse } from 'next/server';
import { normalizeEmailValue, normalizeValue } from '@/shared';
import { createAdminClient } from '@/infrastructure/supabase/server';
import {
  applySupabaseSessionToResponse,
  getRequestContext,
  readSessionFromRequest,
  requireProtectedSession,
  setDeviceIdCookie,
} from './session';
import { getUserById } from './admin.js';
import {
  AUTH_RATE_LIMIT_POLICY_KEYS,
  assertCsrfRequest,
  createStepUpToken,
  enforceAuthRateLimit,
  setStepUpCookie,
} from './security';
import {
  claimVerificationProof,
  completeVerificationProof,
  assertSignUpEmailAvailable,
  clearPendingSignInCookie,
  createPendingSignInToken,
  createVerificationChallengeKey,
  lookupAccountByEmail,
  requestVerificationCode,
  releaseVerificationProof,
  setPendingSignInCookie,
  verifyPendingSignInToken,
  verifyCodeRequest,
} from './verification';
import { createSignUpProofToken, verifySignUpProofToken } from './proof-tokens';
import { ensureAccountProfileRecord } from './account';
import {
  EMAIL_VERIFICATION_PURPOSES,
  PURPOSES,
  SECURE_PURPOSES,
} from '@/domains/auth/utils/constants';
import { validateAllowedEmailDomain } from '@/domains/auth/utils/routes';
import { createError } from '@/domains/auth/utils/errors';
import { resolveAuthCapabilities, resolveProviderIds } from '@/domains/auth/utils/providers';
import { mintPasswordlessSession } from './passwordless-session';
import {
  clearMfaPrimaryCookie,
  createMfaPrimaryChallenge,
  readMfaPrimaryChallenge,
  setMfaPrimaryCookie,
  verifyMfaPrimaryChallenge,
} from './mfa-primary';
import { hasVerifiedMfaFactor, recordAuthMetric } from './security-surfaces';

function createAuthHandlerErrorResponse(error, fallbackMessage) {
  const response = NextResponse.json(
    {
      code: error?.code || null,
      data: error?.data || null,
      error: error?.message || fallbackMessage,
    },
    { status: Number.isInteger(error?.status) ? error.status : 400 },
  );

  if (Number.isFinite(Number(error?.retryAfterSeconds))) {
    response.headers.set('Retry-After', String(Math.max(1, Math.ceil(error.retryAfterSeconds))));
  }

  return response;
}

export async function handleSignInPost(request) {
  try {
    assertCsrfRequest(request);
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmailValue(body?.email || body?.identifier);
    const preferredMethod = normalizeValue(body?.preferredMethod).toLowerCase();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 });
    }

    const requestContext = getRequestContext(request);
    await enforceAuthRateLimit(AUTH_RATE_LIMIT_POLICY_KEYS.SIGN_IN, {
      dimensionValues: {
        device: requestContext.deviceHash,
        email,
        ip: requestContext.ipHash,
      },
    });

    const account = await lookupAccountByEmail(email);
    if (!account.exists) {
      throw createError('USER_NOT_FOUND');
    }

    if (account.seedOtpBypass) {
      const response = NextResponse.json({ success: true, seedTestAccount: true });
      const session = await mintPasswordlessSession({ email, userId: account.userId });
      await applySupabaseSessionToResponse(request, response, session);
      clearPendingSignInCookie(response);
      setDeviceIdCookie(response, requestContext.deviceId);
      return response;
    }

    if (preferredMethod !== 'email' && (await hasVerifiedMfaFactor(account.userId))) {
      const mfaPrimaryToken = await createMfaPrimaryChallenge({
        deviceHash: requestContext.deviceHash,
        email,
        userId: account.userId,
      });

      if (mfaPrimaryToken) {
        const response = NextResponse.json({ requiresMfa: true, email });
        clearPendingSignInCookie(response);
        setMfaPrimaryCookie(response, mfaPrimaryToken);
        setDeviceIdCookie(response, requestContext.deviceId);
        return response;
      }
    }

    const challenge = await requestVerificationCode({
      deviceId: requestContext.deviceId,
      dummy: false,
      email,
      ipAddress: requestContext.ipAddress,
      purpose: 'sign-in',
      userId: account.userId || undefined,
    });
    const pendingToken = createPendingSignInToken({
      challengeKey: challenge.challengeKey,
      deviceHash: requestContext.deviceHash,
      email,
      userId: account.userId,
    });
    const response = NextResponse.json({ requiresVerification: true, email, challenge });
    clearMfaPrimaryCookie(response);
    setPendingSignInCookie(response, pendingToken);
    setDeviceIdCookie(response, requestContext.deviceId);
    return response;
  } catch (error) {
    const message = String(error?.message || 'Sign in failed');
    return createAuthHandlerErrorResponse(error, message);
  }
}

export async function handleMfaPrimaryPost(request) {
  try {
    assertCsrfRequest(request);
    const body = await request.json().catch(() => ({}));
    const code = normalizeValue(body?.code);
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Authenticator code must be 6 digits' }, { status: 400 });
    }

    const requestContext = getRequestContext(request);
    const pending = readMfaPrimaryChallenge(request, { deviceHash: requestContext.deviceHash });
    await enforceAuthRateLimit(AUTH_RATE_LIMIT_POLICY_KEYS.MFA_PRIMARY_VERIFY, {
      dimensionValues: {
        device: requestContext.deviceHash,
        email: pending.email,
        ip: requestContext.ipHash,
      },
    });

    const session = await verifyMfaPrimaryChallenge({ code, pending });
    const response = NextResponse.json({
      success: true,
      session: { user: session.user || { id: pending.userId, email: pending.email } },
    });
    await applySupabaseSessionToResponse(request, response, session);
    clearMfaPrimaryCookie(response);
    setDeviceIdCookie(response, requestContext.deviceId);
    await recordAuthMetric({
      deviceHash: requestContext.deviceHash,
      eventName: 'mfa-primary-success',
      purpose: 'sign-in',
      userId: pending.userId,
    });
    return response;
  } catch (error) {
    return createAuthHandlerErrorResponse(error, 'Authenticator verification failed');
  }
}

export async function handleSignUpCompletePost(request) {
  let claimedProofKey = null;
  let createdUserId = null;
  try {
    assertCsrfRequest(request);
    const body = await request.json().catch(() => ({}));
    const displayName = normalizeValue(body?.displayName);
    const email = normalizeEmailValue(body?.email);
    const signUpProof = normalizeValue(body?.signUpProof);
    const username = normalizeValue(body?.username);

    if (!email || !signUpProof || !username) {
      return NextResponse.json(
        { error: 'email, signUpProof, and username are required' },
        { status: 400 },
      );
    }

    validateAllowedEmailDomain(email);
    const verifiedProof = verifySignUpProofToken(signUpProof, { email });
    const requestContext = getRequestContext(request);
    await enforceAuthRateLimit(AUTH_RATE_LIMIT_POLICY_KEYS.SIGN_UP_COMPLETE, {
      dimensionValues: {
        device: requestContext.deviceHash,
        email,
        ip: requestContext.ipHash,
      },
    });
    await assertSignUpEmailAvailable(email);
    claimedProofKey = await claimVerificationProof({
      ...verifiedProof,
      email,
      purpose: 'sign-up',
    });

    const admin = createAdminClient();
    const createRes = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { display_name: displayName || username, username },
    });

    if (createRes.error || !createRes.data?.user?.id) {
      throw createRes.error || new Error('Failed to create user');
    }

    const userId = createRes.data.user.id;
    createdUserId = userId;
    await ensureAccountProfileRecord({
      displayName: displayName || username,
      email,
      userId,
      username,
    });
    const response = NextResponse.json({ success: true, userId });
    const session = await mintPasswordlessSession({ email, userId });
    await applySupabaseSessionToResponse(request, response, session);
    await completeVerificationProof(claimedProofKey);
    claimedProofKey = null;

    return response;
  } catch (error) {
    if (createdUserId) {
      await createAdminClient()
        .auth.admin.deleteUser(createdUserId)
        .catch(() => null);
    }
    if (claimedProofKey) {
      await releaseVerificationProof(claimedProofKey).catch(() => null);
    }
    return createAuthHandlerErrorResponse(error, 'Sign up failed');
  }
}

export async function handleVerificationPost(request) {
  let claimedProofKey = null;
  let metricAction = '';
  let metricPurpose = null;

  try {
    assertCsrfRequest(request);
    const body = await request.json().catch(() => ({}));
    const action = normalizeValue(body?.action);
    const email = normalizeEmailValue(body?.email);
    const code = normalizeValue(body?.code);
    const purpose = normalizeValue(body?.purpose || 'sign-in');
    const requestContext = getRequestContext(request);
    const normalizedPurpose = purpose.toLowerCase();
    metricAction = action;
    metricPurpose = normalizedPurpose;

    if (!EMAIL_VERIFICATION_PURPOSES.has(normalizedPurpose)) {
      throw new Error('Unsupported email verification purpose');
    }

    const requiresAuthenticatedStepUp = SECURE_PURPOSES.has(normalizedPurpose);
    let stepUpSession = null;

    if (requiresAuthenticatedStepUp) {
      stepUpSession = await requireProtectedSession(request, { allowBearerFallback: false });
      const isEmailChange =
        normalizedPurpose === PURPOSES.EMAIL_CHANGE || normalizedPurpose === 'email_change';

      if (isEmailChange) {
        if (normalizeEmailValue(stepUpSession.email) === email) {
          throw new Error('New email must be different from your current email');
        }
        const lookup = await lookupAccountByEmail(email);
        if (lookup.exists) {
          throw new Error('This email address is already in use by another account');
        }
      } else if (normalizeEmailValue(stepUpSession.email) !== email) {
        throw new Error('Verification email does not match the authenticated account');
      }
    }

    if (action === 'send') {
      if (normalizedPurpose === 'sign-up') {
        validateAllowedEmailDomain(email);
        await assertSignUpEmailAvailable(email);
      }

      const result = await requestVerificationCode({
        deviceId: requestContext.deviceId,
        email,
        enforceSendRateLimit: () =>
          enforceAuthRateLimit(AUTH_RATE_LIMIT_POLICY_KEYS.VERIFICATION_SEND, {
            dimensionValues: {
              device: requestContext.deviceHash,
              email,
              ip: requestContext.ipHash,
            },
          }),
        forceNew: body?.forceNew === true,
        initial: body?.initial === true,
        ipAddress: requestContext.ipAddress,
        purpose,
        userId: stepUpSession?.userId || undefined,
      });
      await recordAuthMetric({
        eventName: 'verification-send',
        metadata: { emailHash: email ? 'present' : 'missing' },
        purpose: normalizedPurpose,
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
          pendingSignIn.deviceHash !== requestContext.deviceHash ||
          pendingSignIn.challengeKey !== createVerificationChallengeKey(email, 'sign-in')
        ) {
          throw new Error('Verification session does not match this device');
        }
      }

      const verified = await verifyCodeRequest({
        code,
        email,
        purpose,
        userId:
          normalizedPurpose === 'sign-in'
            ? pendingSignIn?.userId || undefined
            : stepUpSession?.userId || undefined,
      });
      await recordAuthMetric({
        eventName: 'verification-success',
        purpose: normalizedPurpose,
        userId: verified.userId,
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
      } else if (normPurpose === 'sign-in' && pendingSignIn) {
        claimedProofKey = await claimVerificationProof({
          challengeJti: verified.challengeJti,
          challengeKey: verified.challengeKey,
          email: verified.email,
          purpose: normPurpose,
        });
        const session = await mintPasswordlessSession({
          email: verified.email,
          userId: pendingSignIn.userId || verified.userId,
        });
        const response = NextResponse.json({
          ...result,
          session: {
            user: session.user,
          },
        });
        await applySupabaseSessionToResponse(request, response, session);
        await completeVerificationProof(claimedProofKey);
        claimedProofKey = null;
        clearPendingSignInCookie(response);
        setDeviceIdCookie(response, requestContext.deviceId);
        return response;
      }

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid verification action' }, { status: 400 });
  } catch (error) {
    await recordAuthMetric({
      eventName: 'verification-failed',
      metadata: { action: metricAction || 'unknown' },
      outcome: error?.code || 'error',
      purpose: metricPurpose,
    });
    if (claimedProofKey) {
      await releaseVerificationProof(claimedProofKey).catch(() => null);
    }
    return createAuthHandlerErrorResponse(error, 'Verification failed');
  }
}

export async function handleSessionGet(request) {
  try {
    const sessionContext = await readSessionFromRequest(request, {
      skipSupabaseFallbackIfNoHint: false,
      skipSupabaseFallback: false,
    });

    if (sessionContext?.userId) {
      const user = sessionContext.user || {};
      const tokenClaims = sessionContext.decodedToken || {};
      let currentUser = null;
      try {
        currentUser = await getUserById(sessionContext.userId);
      } catch {}

      const providerData = currentUser?.providerData || [];
      const identities = providerData.length
        ? providerData.map((provider) => ({
            identity_data: { email: provider.email || null },
            provider: provider.providerId,
            user_id: provider.uid,
          }))
        : user.identities || [];
      const appMetadata =
        currentUser?.app_metadata || tokenClaims.app_metadata || user.app_metadata || {};
      const providerIds = resolveProviderIds({
        appMetadata: providerData.length ? {} : appMetadata,
        identities,
        providerData,
        tokenClaims: providerData.length ? {} : tokenClaims,
      });
      return NextResponse.json({
        status: 'authenticated',
        expiresAt: tokenClaims.exp ? tokenClaims.exp * 1000 : null,
        user: {
          id: sessionContext.userId,
          email: currentUser?.email || sessionContext.email || null,
          metadata:
            currentUser?.user_metadata || tokenClaims.user_metadata || user.user_metadata || {},
          app_metadata: appMetadata,
          identities,
        },
        capabilities: {
          ...resolveAuthCapabilities({
            email: currentUser?.email || sessionContext.email || user.email || null,
            providerIds,
          }),
          providerIds,
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
