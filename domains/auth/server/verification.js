import { createHash, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { normalizeEmailValue, normalizeValue } from '@/shared';
import { createAdminClient } from '@/infrastructure/supabase/server';
import {
  AUTH_CHALLENGE_SELECT,
  AUTH_CHALLENGE_TABLE,
  GENERIC_VERIFY_ERROR,
  MAX_VERIFY_ATTEMPTS,
  OTP_CODE_LENGTH,
  OTP_TTL_MS,
  PENDING_SIGN_IN_COOKIE_NAME,
  PENDING_SIGN_IN_MAX_AGE_MS,
  PENDING_SIGN_IN_MAX_AGE_SECONDS,
  PURPOSES,
  RESEND_COOLDOWN_MS,
  SECURE_PURPOSES,
  TOKEN_VERSION,
} from '@/domains/auth/utils/constants';
import {
  resolveAuthCapabilities,
  resolvePrimaryProvider,
  resolveProviderIds,
} from '@/domains/auth/utils/providers';
import { getOAuthProviderLabel } from '@/domains/auth/utils/oauth';
import { canBypassSeedTestAccountOtp } from '@/domains/auth/utils/seed-test-accounts';
import { AUTH_COOKIE_PATH, getCookieValue, isSecureCookieEnvironment } from './session';
import { createAdminAuthFacade } from './admin.js';
import {
  createChallengeProofToken,
  createSignedToken,
  resolveSecretWithFallback,
  verifyChallengeProofToken,
  verifySignedToken,
} from './proof-tokens';

export { PURPOSES };

function hashValue(value) {
  const normalized = normalizeValue(value);
  return normalized ? createHash('sha256').update(normalized).digest('hex') : null;
}

function hashVerificationCode(email, code, salt) {
  const normalizedEmail = normalizeEmailValue(email);
  const normalizedCode = normalizeValue(code);
  const normalizedSalt = normalizeValue(salt);
  return createHash('sha256')
    .update(`${normalizedEmail}:${normalizedCode}:${normalizedSalt}`)
    .digest('hex');
}

function getTimestampMs(value) {
  if (!value) return 0;
  return new Date(value).getTime() || 0;
}

export function createVerificationChallengeKey(email, purpose) {
  return createHash('sha256')
    .update(`${normalizeEmailValue(email)}:${normalizeValue(purpose).toLowerCase()}`)
    .digest('hex');
}

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

function resolveBrevoConfig() {
  const apiKey = normalizeValue(process.env.BREVO_API_KEY);
  const from =
    normalizeValue(process.env.BREVO_SENDER_EMAIL) || normalizeValue(process.env.BREVO_SMTP_FROM);

  if (!apiKey || !from) {
    throw new Error(
      'Brevo email configuration is incomplete. Set BREVO_API_KEY and BREVO_SENDER_EMAIL',
    );
  }

  return { apiKey, from };
}

export async function sendVerificationEmail({ code, email, expiresAt, purpose }) {
  const { apiKey, from } = resolveBrevoConfig();
  const normalizedEmail = normalizeEmailValue(email);

  const subject = `Tvizzie - Your verification code is ${code}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb;">
      <h2 style="font-size: 20px; font-weight: 600; color: #111827; margin-bottom: 16px;">Tvizzie Verification Code</h2>
      <p style="font-size: 14px; color: #4b5563; margin-bottom: 24px;">Use the following 6-digit code to complete your ${purpose} request:</p>
      <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #4f46e5; background-color: #f3f4f6; padding: 16px; text-align: center; margin-bottom: 24px;">
        ${code}
      </div>
      <p style="font-size: 12px; color: #9ca3af;">This code expires in 10 minutes. If you did not request this, please ignore this email</p>
    </div>
  `;

  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { email: from, name: 'Tvizzie' },
      to: [{ email: normalizedEmail }],
      subject,
      textContent: `Your Tvizzie verification code is: ${code}`,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const responseBody = await response.text().catch(() => '');
    let providerMessage = '';

    try {
      providerMessage = normalizeValue(JSON.parse(responseBody)?.message);
    } catch {}

    throw new Error(
      `Email sending failed with status ${response.status}${providerMessage ? `: ${providerMessage}` : ''}`,
    );
  }
}

export async function getChallengeByKey(key) {
  const normalizedKey = normalizeValue(key);
  if (!normalizedKey) return null;

  const admin = createAdminClient();
  const result = await admin
    .from(AUTH_CHALLENGE_TABLE)
    .select(AUTH_CHALLENGE_SELECT)
    .eq('jti', normalizedKey)
    .maybeSingle();

  if (result.error) throw new Error(result.error.message || 'Challenge query failed');
  return result.data || null;
}

export async function upsertChallengeByKey(key, record) {
  const admin = createAdminClient();
  const result = await admin
    .from(AUTH_CHALLENGE_TABLE)
    .upsert({ ...record, challenge_key: key, jti: key }, { onConflict: 'challenge_key' });

  if (result.error) throw new Error(result.error.message || 'Challenge save failed');
}

export async function updateChallengeByKey(key, patch) {
  const admin = createAdminClient();
  const result = await admin.from(AUTH_CHALLENGE_TABLE).update(patch).eq('jti', key);

  if (result.error) throw new Error(result.error.message || 'Challenge update failed');
}

export async function requestVerificationCode({
  deviceId,
  dummy = false,
  email,
  enforceSendRateLimit = null,
  forceNew = false,
  initial = false,
  ipAddress,
  purpose,
  userId,
}) {
  const normalizedEmail = normalizeEmailValue(email);
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('A valid email address is required');
  }

  const normalizedPurpose = normalizeValue(purpose).toLowerCase();
  if (!Object.values(PURPOSES).includes(normalizedPurpose)) {
    throw new Error('Unsupported verification purpose');
  }
  if (SECURE_PURPOSES.has(normalizedPurpose) && !userId) {
    throw new Error('Authenticated user is required for this verification flow');
  }

  const now = Date.now();
  const challengeKey = createVerificationChallengeKey(normalizedEmail, normalizedPurpose);
  const existingData = await getChallengeByKey(challengeKey);

  const existingResendAtMs = getTimestampMs(existingData?.resend_available_at);
  const existingExpiresAtMs = getTimestampMs(existingData?.expires_at);

  if (existingData?.status === 'pending' && existingExpiresAtMs > now && !forceNew) {
    return {
      challengeKey,
      expiresAt: existingData.expires_at,
      resendAvailableAt: existingData.resend_available_at,
    };
  }

  if (forceNew && existingData?.status === 'pending' && existingResendAtMs > now) {
    if (initial) {
      return {
        challengeKey,
        expiresAt: existingData.expires_at,
        resendAvailableAt: existingData.resend_available_at,
      };
    }

    const waitSeconds = Math.max(1, Math.ceil((existingResendAtMs - now) / 1000));
    const error = new Error(
      `Please wait ${waitSeconds} second${waitSeconds === 1 ? '' : 's'} before requesting a new code`,
    );
    error.code = 'VERIFICATION_RESEND_COOLDOWN';
    error.data = {
      challengeKey,
      expiresAt: existingData.expires_at,
      resendAvailableAt: existingData.resend_available_at,
    };
    throw error;
  }

  await enforceSendRateLimit?.();

  const code = String(randomInt(100000, 1000000));
  const salt = randomBytes(16).toString('hex');
  const expiresAtMs = now + OTP_TTL_MS;
  const resendAtMs = now + RESEND_COOLDOWN_MS;

  const challengeRecord = {
    attempt_count: 0,
    code_hash: hashVerificationCode(normalizedEmail, code, salt),
    created_at: new Date(now).toISOString(),
    device_hash: deviceId ? hashValue(deviceId) : null,
    dummy: dummy === true,
    email_hash: hashValue(normalizedEmail),
    expires_at: new Date(expiresAtMs).toISOString(),
    ip_hash: ipAddress ? hashValue(ipAddress) : null,
    jti: challengeKey,
    max_attempts: MAX_VERIFY_ATTEMPTS,
    purpose: normalizedPurpose,
    resend_available_at: new Date(resendAtMs).toISOString(),
    salt,
    status: 'pending',
    step_up_used_at: null,
    updated_at: new Date(now).toISOString(),
    used_at: null,
    user_id: userId ? normalizeValue(userId) : null,
  };

  await upsertChallengeByKey(challengeKey, challengeRecord);

  if (!dummy) {
    try {
      await sendVerificationEmail({
        code,
        email: normalizedEmail,
        expiresAt: expiresAtMs,
        purpose: normalizedPurpose,
      });
    } catch (error) {
      await updateChallengeByKey(challengeKey, {
        status: 'expired',
        updated_at: new Date().toISOString(),
      }).catch(() => null);
      throw error;
    }
  }

  return {
    challengeKey,
    expiresAt: new Date(expiresAtMs).toISOString(),
    resendAvailableAt: new Date(resendAtMs).toISOString(),
  };
}

export async function verifyCodeRequest({ code, email, purpose, userId }) {
  const normalizedEmail = normalizeEmailValue(email);
  const normalizedCode = normalizeValue(code);
  const normalizedPurpose = normalizeValue(purpose).toLowerCase();

  if (!normalizedEmail || !normalizedCode || !normalizedPurpose) {
    throw new Error('Code, email, and purpose are required');
  }
  if (!Object.values(PURPOSES).includes(normalizedPurpose)) {
    throw new Error('Verification code is invalid');
  }

  const challengeKey = createVerificationChallengeKey(normalizedEmail, normalizedPurpose);
  const challenge = await getChallengeByKey(challengeKey);

  if (!challenge || challenge.status !== 'pending' || challenge.used_at) {
    throw new Error('Verification code is invalid');
  }
  if (challenge.user_id && normalizeValue(userId) !== normalizeValue(challenge.user_id)) {
    throw new Error('Verification code is invalid');
  }

  const now = Date.now();
  if (getTimestampMs(challenge.expires_at) <= now) {
    await updateChallengeByKey(challengeKey, {
      status: 'expired',
      updated_at: new Date(now).toISOString(),
    });
    throw new Error('Verification code has expired');
  }

  if (challenge.attempt_count >= challenge.max_attempts) {
    throw new Error('Verification code attempts are exhausted');
  }

  const computedHash = hashVerificationCode(normalizedEmail, normalizedCode, challenge.salt);
  const expectedHash = Buffer.from(String(challenge.code_hash || ''), 'utf8');
  const receivedHash = Buffer.from(computedHash, 'utf8');
  const isCodeValid =
    expectedHash.length === receivedHash.length && timingSafeEqual(expectedHash, receivedHash);
  const admin = createAdminClient();
  const challengeUserId = challenge.user_id || normalizeValue(userId) || null;

  if (!isCodeValid) {
    const attemptResult = await admin.rpc('increment_auth_challenge_attempt', {
      p_challenge_key: challengeKey,
      p_email_hash: hashValue(normalizedEmail),
      p_user_id: challengeUserId,
    });

    if (attemptResult.error) {
      throw new Error(attemptResult.error.message || 'Verification attempt could not be recorded');
    }

    const attempt = Array.isArray(attemptResult.data) ? attemptResult.data[0] : attemptResult.data;
    if (attempt?.status === 'exhausted') {
      throw new Error('Verification code attempts are exhausted');
    }

    throw new Error('Verification code is invalid');
  }

  const consumeResult = await admin.rpc('consume_auth_challenge', {
    p_challenge_key: challengeKey,
    p_code_hash: computedHash,
    p_email_hash: hashValue(normalizedEmail),
    p_user_id: challengeUserId,
  });

  if (consumeResult.error) {
    throw new Error(consumeResult.error.message || 'Verification code could not be consumed');
  }

  const consumedChallenge = Array.isArray(consumeResult.data)
    ? consumeResult.data[0]
    : consumeResult.data;
  if (!consumedChallenge?.jti) {
    throw new Error('Verification code is invalid or has already been used');
  }

  let resolvedUserId = consumedChallenge.user_id || null;
  if (!resolvedUserId) {
    try {
      const userRecord = await createAdminAuthFacade().getUserByEmail(normalizedEmail);
      resolvedUserId = userRecord?.uid || null;
    } catch {}
  }

  return {
    challengeJti: consumedChallenge.jti,
    challengeKey,
    email: normalizedEmail,
    userId: resolvedUserId,
    verifiedAt: new Date(now).toISOString(),
  };
}

export async function claimVerificationProof({ challengeJti, challengeKey, email, purpose }) {
  const normalizedEmail = normalizeEmailValue(email);
  const normalizedPurpose = normalizeValue(purpose).toLowerCase();
  const normalizedJti = normalizeValue(challengeJti);
  const normalizedKey = normalizeValue(challengeKey);
  const expectedKey = createVerificationChallengeKey(normalizedEmail, normalizedPurpose);

  if (
    !normalizedEmail ||
    !Object.values(PURPOSES).includes(normalizedPurpose) ||
    normalizedJti !== expectedKey ||
    normalizedKey !== expectedKey
  ) {
    throw new Error('Verification proof is invalid');
  }

  const admin = createAdminClient();
  const result = await admin
    .from(AUTH_CHALLENGE_TABLE)
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('jti', expectedKey)
    .eq('purpose', normalizedPurpose)
    .eq('status', 'used')
    .select('jti')
    .maybeSingle();

  if (result.error)
    throw new Error(result.error.message || 'Verification proof could not be claimed');
  if (!result.data?.jti) throw new Error('Verification proof has already been used');

  return expectedKey;
}

export async function completeVerificationProof(challengeKey) {
  const normalizedKey = normalizeValue(challengeKey);
  if (!normalizedKey) return;

  const result = await createAdminClient()
    .from(AUTH_CHALLENGE_TABLE)
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('jti', normalizedKey)
    .eq('status', 'processing');

  if (result.error)
    throw new Error(result.error.message || 'Verification proof could not be completed');
}

export async function releaseVerificationProof(challengeKey) {
  const normalizedKey = normalizeValue(challengeKey);
  if (!normalizedKey) return;

  const result = await createAdminClient()
    .from(AUTH_CHALLENGE_TABLE)
    .update({ status: 'used', updated_at: new Date().toISOString() })
    .eq('jti', normalizedKey)
    .eq('status', 'processing');

  if (result.error)
    throw new Error(result.error.message || 'Verification proof could not be released');
}

function getLoginVerificationSecret() {
  return resolveSecretWithFallback({
    primaryEnvName: 'LOGIN_VERIFICATION_SECRET',
    fallbackEnvNames: ['STEP_UP_SECRET', 'EMAIL_VERIFICATION_SECRET'],
    missingMessage: 'LOGIN_VERIFICATION_SECRET is missing and no fallback secret is available',
    warningGlobalKey: '__tvizzie_login_verification_secret_fallback_warned__',
    warningMessage:
      '[Auth] LOGIN_VERIFICATION_SECRET is missing. Falling back to STEP_UP_SECRET or EMAIL_VERIFICATION_SECRET',
  });
}

export function createPendingSignInToken({
  challengeKey,
  deviceHash,
  email,
  userId,
  expiresAt = Date.now() + PENDING_SIGN_IN_MAX_AGE_MS,
}) {
  const normalizedUserId = normalizeValue(userId);
  const normalizedEmail = normalizeEmailValue(email);
  const normalizedDeviceHash = normalizeValue(deviceHash);
  const normalizedChallengeKey = normalizeValue(challengeKey);

  if (!normalizedChallengeKey || !normalizedEmail || !normalizedDeviceHash) {
    throw new Error('Pending sign-in payload is invalid');
  }

  return createSignedToken(
    {
      challengeKey: normalizedChallengeKey,
      deviceHash: normalizedDeviceHash,
      email: normalizedEmail,
      exp: Math.floor(Number(expiresAt) / 1000),
      userId: normalizedUserId || null,
    },
    { secret: getLoginVerificationSecret() },
  );
}

export function verifyPendingSignInToken(token) {
  const payload = verifySignedToken(token, {
    secret: getLoginVerificationSecret(),
    invalidMessage: 'Pending sign-in session is invalid',
  });

  const expiresAtMs = Number(payload?.exp) * 1000;
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    throw new Error('Pending sign-in session has expired');
  }

  return {
    challengeKey: normalizeValue(payload.challengeKey),
    deviceHash: payload.deviceHash,
    email: payload.email,
    expiresAt: new Date(expiresAtMs).toISOString(),
    userId: normalizeValue(payload.userId) || null,
  };
}

export function setPendingSignInCookie(response, token) {
  response.cookies.set(PENDING_SIGN_IN_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: PENDING_SIGN_IN_MAX_AGE_SECONDS,
    path: AUTH_COOKIE_PATH,
    sameSite: 'lax',
    secure: isSecureCookieEnvironment(),
  });
}

export function clearPendingSignInCookie(response) {
  response.cookies.set(PENDING_SIGN_IN_COOKIE_NAME, '', {
    httpOnly: true,
    maxAge: 0,
    path: AUTH_COOKIE_PATH,
    sameSite: 'lax',
    secure: isSecureCookieEnvironment(),
  });
}

export async function lookupAccountByEmail(email) {
  const normalizedEmail = normalizeEmailValue(email);
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Enter a valid email address');
  }

  let userRecord = null;
  try {
    userRecord = await createAdminAuthFacade().getUserByEmail(normalizedEmail);
  } catch (error) {
    const code = normalizeValue(error?.code);
    const message = normalizeValue(error?.message).toLowerCase();
    if (code === 'user-not-found' || message.includes('user not found')) {
      return {
        code: 'user-not-found',
        email: normalizedEmail,
        exists: false,
        providerIds: [],
        userId: null,
      };
    }
    throw error;
  }

  const userId = normalizeValue(userRecord?.uid);
  const matchedOAuthProvider = (userRecord?.providerData || []).find((provider) => {
    const providerId = normalizeValue(provider?.providerId).toLowerCase();
    return (
      providerId !== 'email' &&
      providerId !== 'password' &&
      normalizeEmailValue(provider?.email) === normalizedEmail
    );
  })?.providerId;
  const providerIds = resolveProviderIds({
    providerData: userRecord?.providerData || [],
    appMetadata: userRecord?.app_metadata || {},
  });
  const authCapabilities = resolveAuthCapabilities({ providerIds });

  return {
    capabilities: authCapabilities,
    code: null,
    email: normalizedEmail,
    exists: Boolean(userId),
    matchedOAuthProvider: normalizeValue(matchedOAuthProvider) || null,
    providerIds,
    seedOtpBypass: canBypassSeedTestAccountOtp({
      email: normalizedEmail,
      user: userRecord,
      userId,
    }),
    signInMethods: providerIds,
    userId: userId || null,
  };
}

export function createSignUpEmailAlreadyRegisteredError(account) {
  const email = normalizeEmailValue(account?.email);
  const matchedOAuthProvider = normalizeValue(account?.matchedOAuthProvider);
  const oauthProvider = matchedOAuthProvider
    ? resolvePrimaryProvider([matchedOAuthProvider])
    : null;
  const oauthProviderLabel = oauthProvider ? getOAuthProviderLabel(oauthProvider) : null;
  const error = new Error(
    oauthProviderLabel
      ? `This email is used to sign in with ${oauthProviderLabel} on another account. Continue with ${oauthProviderLabel}, or disconnect it from that account’s security settings before using this email here`
      : 'This email is already registered',
  );

  error.code = oauthProvider
    ? 'OAUTH_ACCOUNT_ALREADY_REGISTERED'
    : 'AUTH_ACCOUNT_ALREADY_REGISTERED';
  error.data = {
    email,
    provider: oauthProvider,
  };
  return error;
}

export async function assertSignUpEmailAvailable(email) {
  const account = await lookupAccountByEmail(email);
  if (account.exists) {
    throw createSignUpEmailAlreadyRegisteredError(account);
  }
  return account;
}
