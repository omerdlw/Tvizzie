import { createHash, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { normalizeEmailValue, normalizeValue } from '@/shared/utils';
import { createAdminClient } from '@/infrastructure/supabase/admin';
import { validateUsername } from '@/domains/account/utils';
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
  resolveAuthCapabilities,
  resolveProviderIds,
  SECURE_PURPOSES,
  TOKEN_VERSION,
  TRUSTED_DEVICE_COOKIE_PREFIX,
  TRUSTED_DEVICE_MAX_AGE_MS,
  TRUSTED_DEVICE_MAX_AGE_SECONDS,
} from '@/domains/auth/utils';
import { AUTH_COOKIE_PATH, getCookieValue, isSecureCookieEnvironment } from './session.server';
import { createAdminAuthFacade } from './session.server';
import {
  createChallengeProofToken,
  createSignedToken,
  resolveSecretWithFallback,
  verifyChallengeProofToken,
  verifySignedToken,
} from './proof-tokens.server';

export { PURPOSES };

// ============================================================
// Password Account Lookup Error Codes & Helpers
// ============================================================

export const PASSWORD_ACCOUNT_LOOKUP_CODES = Object.freeze({
  PASSWORD_RESET_UNAVAILABLE: 'password-reset-unavailable',
  PASSWORD_SIGN_IN_DISABLED: 'password-sign-in-disabled',
  USER_NOT_FOUND: 'user-not-found',
});

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

function createVerificationChallengeKey(email, purpose) {
  return createHash('sha256')
    .update(`${normalizeEmailValue(email)}:${normalizeValue(purpose).toLowerCase()}`)
    .digest('hex');
}

// ============================================================
// Email Delivery Service (Brevo API)
// ============================================================

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
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; rounded: 12px;">
      <h2 style="font-size: 20px; font-weight: 600; color: #111827; margin-bottom: 16px;">Tvizzie Verification Code</h2>
      <p style="font-size: 14px; color: #4b5563; margin-bottom: 24px;">Use the following 6-digit code to complete your ${purpose} request:</p>
      <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #4f46e5; background-color: #f3f4f6; padding: 16px; text-align: center; border-radius: 8px; margin-bottom: 24px;">
        ${code}
      </div>
      <p style="font-size: 12px; color: #9ca3af;">This code expires in 10 minutes. If you did not request this, please ignore this email.</p>
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

// ============================================================
// Email Verification Challenge Store & Rate Limit
// ============================================================

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
  email,
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

  const code = String(randomInt(100000, 1000000));
  const salt = randomBytes(16).toString('hex');
  const expiresAtMs = now + OTP_TTL_MS;
  const resendAtMs = now + RESEND_COOLDOWN_MS;

  const challengeRecord = {
    attempt_count: 0,
    code_hash: hashVerificationCode(normalizedEmail, code, salt),
    created_at: new Date(now).toISOString(),
    device_hash: deviceId ? hashValue(deviceId) : null,
    dummy: false,
    email_hash: hashValue(normalizedEmail),
    expires_at: new Date(expiresAtMs).toISOString(),
    ip_hash: ipAddress ? hashValue(ipAddress) : null,
    jti: challengeKey,
    max_attempts: MAX_VERIFY_ATTEMPTS,
    purpose: normalizedPurpose,
    resend_available_at: new Date(resendAtMs).toISOString(),
    salt,
    status: 'pending',
    updated_at: new Date(now).toISOString(),
    used_at: null,
    user_id: userId ? normalizeValue(userId) : null,
  };

  await upsertChallengeByKey(challengeKey, challengeRecord);

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
  if (expectedHash.length !== receivedHash.length || !timingSafeEqual(expectedHash, receivedHash)) {
    const newAttemptCount = challenge.attempt_count + 1;
    const isExhausted = newAttemptCount >= challenge.max_attempts;
    await updateChallengeByKey(challengeKey, {
      attempt_count: newAttemptCount,
      status: isExhausted ? 'exhausted' : 'pending',
      updated_at: new Date(now).toISOString(),
    });
    throw new Error('Verification code is invalid');
  }

  let resolvedUserId = challenge.user_id || null;
  if (!resolvedUserId) {
    try {
      const userRecord = await createAdminAuthFacade().getUserByEmail(normalizedEmail);
      resolvedUserId = userRecord?.uid || null;
    } catch {}
  }

  await updateChallengeByKey(challengeKey, {
    status: 'used',
    updated_at: new Date(now).toISOString(),
    used_at: new Date(now).toISOString(),
  });

  return {
    challengeJti: challenge.jti,
    challengeKey,
    email: normalizedEmail,
    userId: resolvedUserId,
    verifiedAt: new Date(now).toISOString(),
  };
}

// A proof must be consumed atomically before it can authorize an account
// mutation. This prevents a valid signed proof from being replayed.
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

// ============================================================
// Pending Login & Trusted Device Tokens
// ============================================================

function getLoginVerificationSecret() {
  return resolveSecretWithFallback({
    primaryEnvName: 'LOGIN_VERIFICATION_SECRET',
    fallbackEnvNames: ['STEP_UP_SECRET', 'EMAIL_VERIFICATION_SECRET'],
    missingMessage: 'LOGIN_VERIFICATION_SECRET is missing and no fallback secret is available',
    warningGlobalKey: '__tvizzie_login_verification_secret_fallback_warned__',
    warningMessage:
      '[Auth] LOGIN_VERIFICATION_SECRET is missing. Falling back to STEP_UP_SECRET or EMAIL_VERIFICATION_SECRET.',
  });
}

export function getTrustedLoginDeviceCookieName(userId) {
  const normalizedUserId = normalizeValue(userId);
  if (!normalizedUserId) return '';
  const hash = createHash('sha256').update(normalizedUserId).digest('hex').slice(0, 16);
  return `${TRUSTED_DEVICE_COOKIE_PREFIX}${hash}`;
}

export function createTrustedDeviceToken({
  userId,
  deviceId,
  expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000,
}) {
  return createSignedToken(
    {
      userId: normalizeValue(userId),
      deviceHash: hashValue(deviceId),
      exp: Math.floor(Number(expiresAt) / 1000),
    },
    { secret: getLoginVerificationSecret() },
  );
}

export function verifyTrustedDeviceToken(token, { userId, deviceId }) {
  try {
    const payload = verifySignedToken(token, {
      secret: getLoginVerificationSecret(),
      invalidMessage: 'Trusted device token is invalid',
    });

    const expiresAtMs = Number(payload?.exp) * 1000;
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
      return false;
    }

    if (normalizeValue(payload?.userId) !== normalizeValue(userId)) {
      return false;
    }

    if (normalizeValue(payload?.deviceHash) !== hashValue(deviceId)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function setTrustedDeviceCookie(response, { userId, deviceId }) {
  const cookieName = getTrustedLoginDeviceCookieName(userId);
  if (!cookieName) return;

  const token = createTrustedDeviceToken({ userId, deviceId });

  response.cookies.set(cookieName, token, {
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: AUTH_COOKIE_PATH,
    sameSite: 'lax',
    secure: isSecureCookieEnvironment(),
  });
}

export function setTrustedDeviceCookieToCookieStore(cookieStore, { userId, deviceId }) {
  const cookieName = getTrustedLoginDeviceCookieName(userId);
  if (!cookieName) return;

  const token = createTrustedDeviceToken({ userId, deviceId });

  cookieStore.set(cookieName, token, {
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: AUTH_COOKIE_PATH,
    sameSite: 'lax',
    secure: isSecureCookieEnvironment(),
  });
}

export function isDeviceTrusted(request, { userId, deviceId }) {
  const cookieName = getTrustedLoginDeviceCookieName(userId);
  if (!cookieName) return false;

  const cookieVal = request.cookies.get(cookieName)?.value;
  if (!cookieVal) return false;

  return verifyTrustedDeviceToken(cookieVal, { userId, deviceId });
}

export function createPendingSignInToken({
  accessToken,
  deviceHash,
  email,
  provider,
  refreshToken,
  user,
  userId,
  expiresAt = Date.now() + PENDING_SIGN_IN_MAX_AGE_MS,
}) {
  const normalizedUserId = normalizeValue(userId);
  const normalizedAccessToken = normalizeValue(accessToken);
  const normalizedEmail = normalizeEmailValue(email);
  const normalizedDeviceHash = normalizeValue(deviceHash);
  const normalizedRefreshToken = normalizeValue(refreshToken);

  if (
    !normalizedUserId ||
    !normalizedEmail ||
    !normalizedDeviceHash ||
    !normalizedAccessToken ||
    !normalizedRefreshToken
  ) {
    throw new Error('Pending sign-in payload is invalid');
  }

  return createSignedToken(
    {
      accessToken: normalizedAccessToken,
      deviceHash: normalizedDeviceHash,
      email: normalizedEmail,
      exp: Math.floor(Number(expiresAt) / 1000),
      provider: normalizeValue(provider) || 'password',
      refreshToken: normalizedRefreshToken,
      user: user || null,
      userId: normalizedUserId,
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
    accessToken: payload.accessToken,
    deviceHash: payload.deviceHash,
    email: payload.email,
    expiresAt: new Date(expiresAtMs).toISOString(),
    provider: payload.provider || 'password',
    refreshToken: payload.refreshToken,
    user: payload.user || null,
    userId: payload.userId,
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

// ============================================================
// Password Account Resolution & Lookups
// ============================================================

export async function resolvePasswordAccountIdentifier(identifier) {
  const normalizedIdentifier = normalizeValue(identifier);
  if (!normalizedIdentifier) throw new Error('Username or email is required');

  if (normalizedIdentifier.includes('@')) {
    return { email: normalizeEmailValue(normalizedIdentifier), userId: null, username: null };
  }

  const username = validateUsername(normalizedIdentifier);
  const profileResult = await createAdminClient()
    .from('profiles')
    .select('id, email, username')
    .eq('username_lower', username)
    .maybeSingle();

  if (profileResult.error || !profileResult.data?.email) {
    const err = new Error('No account was found with this username');
    err.code = PASSWORD_ACCOUNT_LOOKUP_CODES.USER_NOT_FOUND;
    throw err;
  }

  return {
    email: normalizeEmailValue(profileResult.data.email),
    userId: normalizeValue(profileResult.data.id) || null,
    username: normalizeValue(profileResult.data.username) || username,
  };
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
    if (
      code === PASSWORD_ACCOUNT_LOOKUP_CODES.USER_NOT_FOUND ||
      message.includes('user not found')
    ) {
      return {
        code: PASSWORD_ACCOUNT_LOOKUP_CODES.USER_NOT_FOUND,
        email: normalizedEmail,
        exists: false,
        providerIds: [],
        supportsPasswordAuth: false,
        userId: null,
      };
    }
    throw error;
  }

  const userId = normalizeValue(userRecord?.uid);
  const providerIds = resolveProviderIds({
    providerData: userRecord?.providerData || [],
    appMetadata: userRecord?.app_metadata || {},
  });
  const authCapabilities = resolveAuthCapabilities({ providerIds, email: normalizedEmail });

  return {
    capabilities: authCapabilities,
    code: null,
    email: normalizedEmail,
    exists: Boolean(userId),
    providerIds,
    signInMethods: providerIds,
    supportsPasswordAuth: authCapabilities.passwordEnabled,
    userId: userId || null,
  };
}

export async function lookupPasswordAccountByEmail(email, { requireProfile = false } = {}) {
  const lookup = await lookupAccountByEmail(email);

  if (!lookup.userId) {
    return {
      code: lookup.code || PASSWORD_ACCOUNT_LOOKUP_CODES.USER_NOT_FOUND,
      email: lookup.email,
      eligible: false,
      exists: false,
      profileEligible: false,
      providerIds: [],
      signInMethods: [],
      supportsPasswordAuth: false,
      userId: null,
    };
  }

  if (!lookup.supportsPasswordAuth) {
    return {
      code: PASSWORD_ACCOUNT_LOOKUP_CODES.PASSWORD_SIGN_IN_DISABLED,
      email: lookup.email,
      eligible: false,
      exists: true,
      profileEligible: false,
      providerIds: lookup.providerIds || [],
      signInMethods: lookup.signInMethods,
      supportsPasswordAuth: false,
      userId: lookup.userId,
    };
  }

  return {
    capabilities: lookup.capabilities,
    code: null,
    email: lookup.email,
    eligible: true,
    exists: true,
    profileEligible: true,
    providerIds: lookup.providerIds,
    signInMethods: lookup.signInMethods,
    supportsPasswordAuth: true,
    userId: lookup.userId,
  };
}
