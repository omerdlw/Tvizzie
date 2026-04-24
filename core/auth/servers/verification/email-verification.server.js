import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto';

import {
  enforceSlidingWindowRateLimit,
  isSlidingWindowRateLimitError,
} from '@/core/auth/servers/security/rate-limit.server';
import { AUTH_CHALLENGE_TABLE } from '@/core/auth/auth.constants';
import { createAdminClient } from '@/core/clients/supabase/admin';
const GENERIC_VERIFY_ERROR = 'Verification could not be completed';
const OTP_CODE_LENGTH = 6;
const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;
const TOKEN_VERSION = 3;
const AUTH_CHALLENGE_SELECT = [
  'attempt_count',
  'code_hash',
  'dummy',
  'email_hash',
  'expires_at',
  'jti',
  'max_attempts',
  'purpose',
  'resend_available_at',
  'salt',
  'status',
  'used_at',
  'user_id',
].join(',');

export const PURPOSES = Object.freeze({
  ACCOUNT_DELETE: 'account-delete',
  EMAIL_CHANGE: 'email-change',
  PASSWORD_CHANGE: 'password-change',
  PASSWORD_SET: 'password-set',
  PASSWORD_RESET: 'password-reset',
  PROVIDER_LINK: 'provider-link',
  SIGN_IN: 'sign-in',
  SIGN_UP: 'sign-up',
});

const SECURE_PURPOSES = new Set([
  PURPOSES.ACCOUNT_DELETE,
  PURPOSES.EMAIL_CHANGE,
  PURPOSES.PASSWORD_CHANGE,
  PURPOSES.PASSWORD_SET,
  PURPOSES.PROVIDER_LINK,
]);

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeEmail(value) {
  return normalizeValue(value).toLowerCase();
}

function normalizeUserId(value) {
  return normalizeValue(value);
}

function toBase64Url(value) {
  return Buffer.from(value).toString('base64url');
}

function parseBase64Url(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function getSecret() {
  const secret = normalizeValue(process.env.EMAIL_VERIFICATION_SECRET);

  if (!secret) {
    throw new Error('EMAIL_VERIFICATION_SECRET is missing on the server. Configure email verification settings');
  }

  return secret;
}

function hashValue(value) {
  return createHash('sha256').update(normalizeValue(value)).digest('hex');
}

function hashVerificationCode(email, code, salt) {
  return createHash('sha256')
    .update(`${normalizeEmail(email)}:${normalizeValue(code)}:${normalizeValue(salt)}`)
    .digest('hex');
}

function createOtpCode() {
  return String(randomInt(0, 10 ** OTP_CODE_LENGTH)).padStart(OTP_CODE_LENGTH, '0');
}

function createChallengeKey({ email, purpose, userId }) {
  return hashValue(`${normalizeValue(purpose)}:${normalizeEmail(email)}:${normalizeUserId(userId) || '-'}`);
}

function toDateValue(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function getTimestampMs(value) {
  const date = toDateValue(value);
  return date ? date.getTime() : 0;
}

function signPayload(payload) {
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = createHmac('sha256', getSecret()).update(encodedPayload).digest('base64url');

  return `${encodedPayload}.${signature}`;
}

function verifyToken(token) {
  const normalizedToken = normalizeValue(token);
  const [encodedPayload, signature] = normalizedToken.split('.');

  if (!encodedPayload || !signature) {
    throw new Error(GENERIC_VERIFY_ERROR);
  }

  const expectedSignature = createHmac('sha256', getSecret()).update(encodedPayload).digest('base64url');
  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
    throw new Error(GENERIC_VERIFY_ERROR);
  }

  try {
    return JSON.parse(parseBase64Url(encodedPayload));
  } catch {
    throw new Error(GENERIC_VERIFY_ERROR);
  }
}

async function enforceSendCodeRateLimit({ email, ipAddress, deviceId, purpose }) {
  try {
    await enforceSlidingWindowRateLimit({
      namespace: `auth:verification:send-code:${purpose}`,
      windowMs: 15 * 60 * 1000,
      dimensions: [
        { id: 'email', value: email, limit: 4 },
        { id: 'ip', value: ipAddress || 'unknown', limit: 14 },
        { id: 'device', value: deviceId || 'unknown', limit: 8 },
      ],
      message: 'Too many verification code requests',
    });
  } catch (error) {
    if (!isSlidingWindowRateLimitError(error)) {
      throw error;
    }

    if (error.dimension === 'email') {
      throw new Error('Too many verification requests for this email address');
    }

    if (error.dimension === 'device') {
      throw new Error('Too many verification requests from this device');
    }

    throw new Error('Too many verification requests from this network');
  }
}

function buildChallengeToken({ exp, jti, key }) {
  return signPayload({
    exp,
    jti,
    key,
    v: TOKEN_VERSION,
  });
}

function getChallengesTable() {
  return createAdminClient().from(AUTH_CHALLENGE_TABLE);
}

async function getChallengeByKey(key) {
  const result = await getChallengesTable().select(AUTH_CHALLENGE_SELECT).eq('challenge_key', key).maybeSingle();

  if (result.error) {
    throw new Error(result.error.message || 'Verification challenge could not be loaded');
  }

  return result.data || null;
}

async function upsertChallengeByKey(key, payload) {
  const result = await getChallengesTable().upsert(
    {
      challenge_key: key,
      ...payload,
    },
    {
      onConflict: 'challenge_key',
    }
  );

  if (result.error) {
    throw new Error(result.error.message || 'Verification challenge could not be persisted');
  }
}

async function updateChallengeByKey(key, payload) {
  const result = await getChallengesTable().update(payload).eq('challenge_key', key);

  if (result.error) {
    throw new Error(result.error.message || 'Verification challenge could not be updated');
  }
}

function buildChallengeResponse({ expiresAt, jti, key, resendAvailableAt }) {
  const expiresAtMs = getTimestampMs(expiresAt);

  if (!expiresAtMs || !normalizeValue(jti) || !normalizeValue(key)) {
    return null;
  }

  return {
    challengeToken: buildChallengeToken({
      exp: expiresAtMs,
      jti,
      key,
    }),
    expiresAt: new Date(expiresAtMs).toISOString(),
    resendAvailableAt: toDateValue(resendAvailableAt)?.toISOString() || null,
  };
}

export function assertVerificationPurpose(value) {
  const normalizedPurpose = normalizeValue(value).toLowerCase();

  if (!Object.values(PURPOSES).includes(normalizedPurpose)) {
    throw new Error('Unsupported verification purpose');
  }

  return normalizedPurpose;
}

export async function createEmailVerificationChallenge({
  deviceId = '',
  dummy = false,
  email,
  forceNew = false,
  ipAddress = '',
  purpose = PURPOSES.SIGN_UP,
  userId = null,
}) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPurpose = assertVerificationPurpose(purpose);
  const normalizedUserId = normalizeUserId(userId);

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('A valid email address is required');
  }

  if (SECURE_PURPOSES.has(normalizedPurpose) && !normalizedUserId) {
    throw new Error('Authenticated user is required for this verification flow');
  }

  await enforceSendCodeRateLimit({
    deviceId,
    email: normalizedEmail,
    ipAddress,
    purpose: normalizedPurpose,
  });

  const key = createChallengeKey({
    email: normalizedEmail,
    purpose: normalizedPurpose,
    userId: normalizedUserId,
  });
  const now = Date.now();
  const existingData = await getChallengeByKey(key);
  const existingExpiresAtMs = getTimestampMs(existingData?.expires_at);
  const existingResendAtMs = getTimestampMs(existingData?.resend_available_at);
  const hasReusableChallenge =
    !forceNew &&
    existingData &&
    existingData.status === 'pending' &&
    !existingData.used_at &&
    existingExpiresAtMs > now &&
    existingResendAtMs > now;

  if (hasReusableChallenge) {
    const existingChallenge = buildChallengeResponse({
      expiresAt: existingData?.expires_at,
      jti: existingData?.jti,
      key,
      resendAvailableAt: existingData?.resend_available_at,
    });

    if (existingChallenge) {
      return {
        ...existingChallenge,
        code: null,
      };
    }
  }

  if (!forceNew && existingResendAtMs > now) {
    const waitSeconds = Math.max(1, Math.ceil((existingResendAtMs - now) / 1000));
    throw new Error(`Please wait ${waitSeconds} second${waitSeconds === 1 ? '' : 's'} before requesting a new code`);
  }

  const currentExpiresAt = now + OTP_TTL_MS;
  const resendAvailableAt = now + RESEND_COOLDOWN_MS;
  const code = createOtpCode();
  const salt = randomBytes(16).toString('hex');
  const jti = randomBytes(12).toString('hex');
  const challengeToken = buildChallengeToken({
    exp: currentExpiresAt,
    jti,
    key,
  });

  await upsertChallengeByKey(key, {
    attempt_count: 0,
    code_hash: hashVerificationCode(normalizedEmail, code, salt),
    created_at: new Date(now).toISOString(),
    device_hash: deviceId ? hashValue(deviceId) : null,
    dummy: Boolean(dummy),
    email_hash: hashValue(normalizedEmail),
    expires_at: new Date(currentExpiresAt).toISOString(),
    ip_hash: ipAddress ? hashValue(ipAddress) : null,
    jti,
    max_attempts: MAX_VERIFY_ATTEMPTS,
    purpose: normalizedPurpose,
    resend_available_at: new Date(resendAvailableAt).toISOString(),
    salt,
    status: 'pending',
    updated_at: new Date(now).toISOString(),
    used_at: null,
    user_id: normalizedUserId || null,
  });

  const persistedData = (await getChallengeByKey(key)) || {};
  const persistedChallenge = buildChallengeResponse({
    expiresAt: persistedData?.expires_at || new Date(currentExpiresAt),
    jti: persistedData?.jti || jti,
    key,
    resendAvailableAt: persistedData?.resend_available_at || new Date(resendAvailableAt),
  }) || {
    challengeToken,
    expiresAt: new Date(currentExpiresAt).toISOString(),
    resendAvailableAt: new Date(resendAvailableAt).toISOString(),
  };

  return {
    ...persistedChallenge,
    code,
  };
}

export async function verifyEmailVerificationChallenge({
  challengeToken,
  code,
  email,
  purpose = PURPOSES.SIGN_UP,
  userId = null,
}) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedCode = normalizeValue(code);
  const normalizedPurpose = assertVerificationPurpose(purpose);
  const normalizedUserId = normalizeUserId(userId);

  if (!new RegExp(`^\\d{${OTP_CODE_LENGTH}}$`).test(normalizedCode)) {
    throw new Error('Verification code must be 6 digits');
  }

  const payload = verifyToken(challengeToken);

  if (payload?.v !== TOKEN_VERSION || !payload?.exp || !payload?.jti || !payload?.key) {
    throw new Error(GENERIC_VERIFY_ERROR);
  }

  if (Date.now() > Number(payload.exp)) {
    throw new Error('Verification code has expired');
  }

  const challengeKey = normalizeValue(payload?.key);
  const now = Date.now();
  const challenge = await getChallengeByKey(challengeKey);

  if (!challenge) {
    throw new Error(GENERIC_VERIFY_ERROR);
  }

  const expiresAtMs = getTimestampMs(challenge?.expires_at);
  const currentAttempts = Number(challenge?.attempt_count || 0);
  const maxAttempts = Number(challenge?.max_attempts || MAX_VERIFY_ATTEMPTS);
  const isPurposeMismatch = challenge?.purpose !== normalizedPurpose;
  const isEmailMismatch = normalizeValue(challenge?.email_hash) !== hashValue(normalizedEmail);
  const isUserMismatch =
    SECURE_PURPOSES.has(normalizedPurpose) && normalizeUserId(challenge?.user_id) !== normalizedUserId;
  const isTokenMismatch = normalizeValue(challenge?.jti) !== normalizeValue(payload?.jti);
  const isExpired = expiresAtMs > 0 && expiresAtMs <= now;

  if (isExpired) {
    await updateChallengeByKey(challengeKey, {
      status: 'expired',
      updated_at: new Date(now).toISOString(),
    });
    throw new Error('Verification code has expired');
  }

  if (isPurposeMismatch || isEmailMismatch || isUserMismatch || isTokenMismatch) {
    throw new Error(GENERIC_VERIFY_ERROR);
  }

  if (challenge?.status === 'used' || challenge?.used_at) {
    throw new Error('Verification code has already been used');
  }

  if (currentAttempts >= maxAttempts) {
    throw new Error('Verification code attempts are exhausted');
  }

  const expectedCodeHash = hashVerificationCode(normalizedEmail, normalizedCode, challenge?.salt);
  const nextAttemptCount = currentAttempts + 1;

  if (challenge?.dummy || expectedCodeHash !== challenge?.code_hash) {
    await updateChallengeByKey(challengeKey, {
      attempt_count: nextAttemptCount,
      status: nextAttemptCount >= maxAttempts ? 'exhausted' : 'pending',
      updated_at: new Date(now).toISOString(),
    });

    throw new Error(
      nextAttemptCount >= maxAttempts ? 'Verification code attempts are exhausted' : 'Verification code is invalid'
    );
  }

  const verifiedAt = new Date(now).toISOString();

  await updateChallengeByKey(challengeKey, {
    status: 'used',
    updated_at: verifiedAt,
    used_at: verifiedAt,
  });

  return {
    challengeKey,
    challengeJti: normalizeValue(challenge?.jti),
    email: normalizedEmail,
    userId: normalizeUserId(challenge?.user_id) || null,
    verifiedAt,
  };
}

export { GENERIC_VERIFY_ERROR };
