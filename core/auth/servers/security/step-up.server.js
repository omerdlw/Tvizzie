import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

import {
  STEP_UP_COOKIE_NAME,
  STEP_UP_MAX_AGE_MS,
  STEP_UP_MAX_AGE_SECONDS,
  AUTH_COOKIE_PATH,
  getCookieValue,
  isSecureCookieEnvironment,
} from '@/core/auth/servers/session/session.server';

const PURPOSE_SEPARATOR = ':';

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizePurpose(value) {
  return normalizeValue(value).toLowerCase();
}

function normalizeEmail(value) {
  return normalizeValue(value).toLowerCase();
}

function warnFallbackSecret() {
  const key = '__tvizzie_step_up_secret_fallback_warned__';

  if (globalThis[key]) {
    return;
  }

  globalThis[key] = true;
  console.warn(
    '[Auth] STEP_UP_SECRET is missing. Falling back to EMAIL_VERIFICATION_SECRET. Configure STEP_UP_SECRET explicitly.'
  );
}

function getSecret() {
  const secret = normalizeValue(process.env.STEP_UP_SECRET);

  if (secret) {
    return secret;
  }

  const fallbackSecret = normalizeValue(process.env.EMAIL_VERIFICATION_SECRET);

  if (!fallbackSecret) {
    throw new Error('STEP_UP_SECRET is missing on the server and EMAIL_VERIFICATION_SECRET fallback is unavailable');
  }

  warnFallbackSecret();
  return fallbackSecret;
}

function signPayload(encodedPayload) {
  return createHmac('sha256', getSecret()).update(encodedPayload).digest('base64url');
}

function encodePayload(payload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodePayload(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

export function createStepUpToken({
  challengeJti = null,
  email = null,
  purpose,
  userId,
  expiresAt = Date.now() + STEP_UP_MAX_AGE_MS,
}) {
  const normalizedPurpose = normalizePurpose(purpose);
  const normalizedUserId = normalizeValue(userId);
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedPurpose || !normalizedUserId) {
    throw new Error('Step-up purpose and userId are required');
  }

  const payload = {
    exp: Math.floor(Number(expiresAt) / 1000),
    jti: normalizeValue(challengeJti) || randomBytes(12).toString('hex'),
    email: normalizedEmail || null,
    purpose: normalizedPurpose,
    userId: normalizedUserId,
  };

  const encodedPayload = encodePayload(payload);
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyStepUpToken(token) {
  const normalizedToken = normalizeValue(token);
  const [encodedPayload, signature] = normalizedToken.split('.');

  if (!encodedPayload || !signature) {
    throw new Error('Invalid step-up token');
  }

  const expectedSignature = signPayload(encodedPayload);
  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
    throw new Error('Invalid step-up token');
  }

  let payload = null;

  try {
    payload = decodePayload(encodedPayload);
  } catch {
    throw new Error('Invalid step-up token');
  }

  const expiresAtMs = Number(payload?.exp) * 1000;

  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    throw new Error('Step-up verification expired');
  }

  return {
    challengeJti: normalizeValue(payload?.jti) || null,
    email: normalizeEmail(payload?.email) || null,
    expiresAt: new Date(expiresAtMs).toISOString(),
    purpose: normalizePurpose(payload?.purpose),
    userId: normalizeValue(payload?.userId) || null,
  };
}

export function readStepUpFromRequest(request) {
  const token = getCookieValue(request, STEP_UP_COOKIE_NAME);

  if (!token) {
    return null;
  }

  return verifyStepUpToken(token);
}

export function listStepUpPurposes(stepUpPayload = null) {
  const purpose = normalizePurpose(stepUpPayload?.purpose);
  return purpose ? [purpose] : [];
}

export function assertStepUp(request, { purpose, userId, email = null }) {
  const stepUp = readStepUpFromRequest(request);
  const expectedPurpose = normalizePurpose(purpose);
  const expectedUserId = normalizeValue(userId);
  const expectedEmail = normalizeEmail(email);

  if (!stepUp) {
    throw new Error('Step-up verification is required');
  }

  if (stepUp.userId !== expectedUserId) {
    throw new Error('Step-up verification is invalid');
  }

  const purposeList = stepUp.purpose
    .split(PURPOSE_SEPARATOR)
    .map((item) => normalizePurpose(item))
    .filter(Boolean);

  if (!purposeList.includes(expectedPurpose)) {
    throw new Error('Step-up verification is invalid');
  }

  if (expectedEmail && stepUp.email !== expectedEmail) {
    throw new Error('Step-up verification is invalid');
  }

  return stepUp;
}

export function setStepUpCookie(response, token) {
  response.cookies.set(STEP_UP_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: STEP_UP_MAX_AGE_SECONDS,
    path: AUTH_COOKIE_PATH,
    sameSite: 'strict',
    secure: isSecureCookieEnvironment(),
  });
}

export function clearStepUpCookie(response) {
  response.cookies.set(STEP_UP_COOKIE_NAME, '', {
    httpOnly: true,
    maxAge: 0,
    path: AUTH_COOKIE_PATH,
    sameSite: 'strict',
    secure: isSecureCookieEnvironment(),
  });
}
