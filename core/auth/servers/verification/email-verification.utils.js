import { normalizeEmailValue, normalizeValue } from '@/core/utils/string';
import { createHash, randomBytes, randomInt } from 'crypto';

import { OTP_CODE_LENGTH } from './email-verification.constants';

export function normalizeEmail(value) {
  return normalizeEmailValue(value);
}

export function normalizeUserId(value) {
  return normalizeValue(value);
}

export function hashValue(value) {
  return createHash('sha256').update(normalizeValue(value)).digest('hex');
}

export function hashVerificationCode(email, code, salt) {
  return createHash('sha256')
    .update(`${normalizeEmail(email)}:${normalizeValue(code)}:${normalizeValue(salt)}`)
    .digest('hex');
}

export function createOtpCode() {
  return String(randomInt(0, 10 ** OTP_CODE_LENGTH)).padStart(OTP_CODE_LENGTH, '0');
}

export function createChallengeKey({ email, purpose, userId }) {
  return hashValue(`${normalizeValue(purpose)}:${normalizeEmail(email)}:${normalizeUserId(userId) || '-'}`);
}

export function createRandomHex(bytes) {
  return randomBytes(bytes).toString('hex');
}

export function toDateValue(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export function getTimestampMs(value) {
  const date = toDateValue(value);
  return date ? date.getTime() : 0;
}

export function buildChallengeResponse({ buildChallengeToken, expiresAt, jti, key, resendAvailableAt }) {
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
