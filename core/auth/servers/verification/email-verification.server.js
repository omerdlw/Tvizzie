import { normalizeValue } from '@/core/utils/string';

import {
  GENERIC_VERIFY_ERROR,
  MAX_VERIFY_ATTEMPTS,
  OTP_CODE_LENGTH,
  OTP_TTL_MS,
  PURPOSES,
  RESEND_COOLDOWN_MS,
  SECURE_PURPOSES,
  TOKEN_VERSION,
} from './email-verification.constants';
import { enforceSendCodeRateLimit } from './email-verification.rate-limit.server';
import { getChallengeByKey, updateChallengeByKey, upsertChallengeByKey } from './email-verification.store.server';
import { buildChallengeToken, verifyChallengeToken } from './email-verification.token.server';
import {
  buildChallengeResponse,
  createChallengeKey,
  createOtpCode,
  createRandomHex,
  getTimestampMs,
  hashValue,
  hashVerificationCode,
  normalizeEmail,
  normalizeUserId,
} from './email-verification.utils';

export { PURPOSES };

function assertChallengePayload(payload) {
  if (payload?.v !== TOKEN_VERSION || !payload?.exp || !payload?.jti || !payload?.key) {
    throw new Error(GENERIC_VERIFY_ERROR);
  }
}

function assertPurposeUserRequirement({ purpose, userId }) {
  if (SECURE_PURPOSES.has(purpose) && !userId) {
    throw new Error('Authenticated user is required for this verification flow');
  }
}

function ensureValidEmail(email) {
  if (!email || !email.includes('@')) {
    throw new Error('A valid email address is required');
  }
}

function createChallengeState({ existingData, forceNew, now }) {
  const existingExpiresAtMs = getTimestampMs(existingData?.expires_at);
  const existingResendAtMs = getTimestampMs(existingData?.resend_available_at);
  const hasReusableChallenge =
    !forceNew &&
    existingData &&
    existingData.status === 'pending' &&
    !existingData.used_at &&
    existingExpiresAtMs > now &&
    existingResendAtMs > now;

  return {
    existingExpiresAtMs,
    existingResendAtMs,
    hasReusableChallenge,
  };
}

function assertResendWindow({ existingResendAtMs, forceNew, now }) {
  if (!forceNew && existingResendAtMs > now) {
    const waitSeconds = Math.max(1, Math.ceil((existingResendAtMs - now) / 1000));
    throw new Error(`Please wait ${waitSeconds} second${waitSeconds === 1 ? '' : 's'} before requesting a new code`);
  }
}

function createChallengeRecord({
  code,
  currentExpiresAt,
  deviceId,
  dummy,
  ipAddress,
  jti,
  normalizedEmail,
  normalizedPurpose,
  normalizedUserId,
  now,
  resendAvailableAt,
  salt,
}) {
  return {
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
  };
}

function createVerificationResult({ challenge, challengeKey, email, verifiedAt }) {
  return {
    challengeKey,
    challengeJti: normalizeValue(challenge?.jti),
    email,
    userId: normalizeUserId(challenge?.user_id) || null,
    verifiedAt,
  };
}

function assertChallengeNotExpired({ challenge, challengeKey, now }) {
  const expiresAtMs = getTimestampMs(challenge?.expires_at);

  if (expiresAtMs <= 0 || expiresAtMs > now) {
    return;
  }

  return updateChallengeByKey(challengeKey, {
    status: 'expired',
    updated_at: new Date(now).toISOString(),
  }).then(() => {
    throw new Error('Verification code has expired');
  });
}

function assertChallengeMatches({ challenge, normalizedEmail, normalizedPurpose, normalizedUserId, payload }) {
  const isPurposeMismatch = challenge?.purpose !== normalizedPurpose;
  const isEmailMismatch = normalizeValue(challenge?.email_hash) !== hashValue(normalizedEmail);
  const isUserMismatch =
    SECURE_PURPOSES.has(normalizedPurpose) && normalizeUserId(challenge?.user_id) !== normalizedUserId;
  const isTokenMismatch = normalizeValue(challenge?.jti) !== normalizeValue(payload?.jti);

  if (isPurposeMismatch || isEmailMismatch || isUserMismatch || isTokenMismatch) {
    throw new Error(GENERIC_VERIFY_ERROR);
  }
}

async function validateVerificationAttempt({ challenge, challengeKey, normalizedCode, normalizedEmail }) {
  const now = Date.now();
  const currentAttempts = Number(challenge?.attempt_count || 0);
  const maxAttempts = Number(challenge?.max_attempts || MAX_VERIFY_ATTEMPTS);

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

  ensureValidEmail(normalizedEmail);
  assertPurposeUserRequirement({
    purpose: normalizedPurpose,
    userId: normalizedUserId,
  });

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
  const challengeState = createChallengeState({
    existingData,
    forceNew,
    now,
  });

  if (challengeState.hasReusableChallenge) {
    const existingChallenge = buildChallengeResponse({
      buildChallengeToken,
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

  assertResendWindow({
    existingResendAtMs: challengeState.existingResendAtMs,
    forceNew,
    now,
  });

  const currentExpiresAt = now + OTP_TTL_MS;
  const resendAvailableAt = now + RESEND_COOLDOWN_MS;
  const code = createOtpCode();
  const salt = createRandomHex(16);
  const jti = createRandomHex(12);
  const challengeToken = buildChallengeToken({
    exp: currentExpiresAt,
    jti,
    key,
  });

  await upsertChallengeByKey(
    key,
    createChallengeRecord({
      code,
      currentExpiresAt,
      deviceId,
      dummy,
      ipAddress,
      jti,
      normalizedEmail,
      normalizedPurpose,
      normalizedUserId,
      now,
      resendAvailableAt,
      salt,
    })
  );

  const persistedData = (await getChallengeByKey(key)) || {};
  const persistedChallenge = buildChallengeResponse({
    buildChallengeToken,
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

  const payload = verifyChallengeToken(challengeToken, GENERIC_VERIFY_ERROR);

  assertChallengePayload(payload);

  if (Date.now() > Number(payload.exp)) {
    throw new Error('Verification code has expired');
  }

  const challengeKey = normalizeValue(payload.key);
  const now = Date.now();
  const challenge = await getChallengeByKey(challengeKey);

  if (!challenge) {
    throw new Error(GENERIC_VERIFY_ERROR);
  }

  await assertChallengeNotExpired({
    challenge,
    challengeKey,
    now,
  });
  assertChallengeMatches({
    challenge,
    normalizedEmail,
    normalizedPurpose,
    normalizedUserId,
    payload,
  });

  await validateVerificationAttempt({
    challenge,
    challengeKey,
    normalizedCode,
    normalizedEmail,
  });

  const verifiedAt = new Date(now).toISOString();

  await updateChallengeByKey(challengeKey, {
    status: 'used',
    updated_at: verifiedAt,
    used_at: verifiedAt,
  });

  return createVerificationResult({
    challenge,
    challengeKey,
    email: normalizedEmail,
    verifiedAt,
  });
}

export { GENERIC_VERIFY_ERROR };
