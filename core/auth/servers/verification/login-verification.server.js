import { createHash, createHmac, timingSafeEqual } from 'crypto';

import {
  AUTH_COOKIE_PATH,
  getCookieValue,
  isSecureCookieEnvironment,
} from '@/core/auth/servers/session/session.server';

const PENDING_SIGN_IN_COOKIE_NAME = 'tvz_login_pending';
const TRUSTED_DEVICE_COOKIE_PREFIX = 'tvz_login_trust_';
const PENDING_SIGN_IN_MAX_AGE_MS = 30 * 60 * 1000;
const PENDING_SIGN_IN_MAX_AGE_SECONDS = PENDING_SIGN_IN_MAX_AGE_MS / 1000;
const TRUSTED_DEVICE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const TRUSTED_DEVICE_MAX_AGE_SECONDS = TRUSTED_DEVICE_MAX_AGE_MS / 1000;

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeEmail(value) {
  return normalizeValue(value).toLowerCase();
}

function createCookieOptions({ maxAge, sameSite = 'lax' }) {
  return {
    httpOnly: true,
    maxAge,
    path: AUTH_COOKIE_PATH,
    sameSite,
    secure: isSecureCookieEnvironment(),
  };
}

function warnFallbackSecret() {
  const key = '__tvizzie_login_verification_secret_fallback_warned__';

  if (globalThis[key]) {
    return;
  }

  globalThis[key] = true;
  console.warn(
    '[Auth] LOGIN_VERIFICATION_SECRET is missing. Falling back to STEP_UP_SECRET or EMAIL_VERIFICATION_SECRET.'
  );
}

function getSecret() {
  const explicitSecret = normalizeValue(process.env.LOGIN_VERIFICATION_SECRET);

  if (explicitSecret) {
    return explicitSecret;
  }

  const fallbackSecret =
    normalizeValue(process.env.STEP_UP_SECRET) || normalizeValue(process.env.EMAIL_VERIFICATION_SECRET);

  if (!fallbackSecret) {
    throw new Error('LOGIN_VERIFICATION_SECRET is missing and no fallback secret is available');
  }

  warnFallbackSecret();
  return fallbackSecret;
}

function encodePayload(payload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodePayload(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

function signPayload(encodedPayload) {
  return createHmac('sha256', getSecret()).update(encodedPayload).digest('base64url');
}

function verifyToken(token, fallbackMessage) {
  const normalizedToken = normalizeValue(token);
  const [encodedPayload, signature] = normalizedToken.split('.');

  if (!encodedPayload || !signature) {
    throw new Error(fallbackMessage);
  }

  const expectedSignature = signPayload(encodedPayload);
  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
    throw new Error(fallbackMessage);
  }

  try {
    return decodePayload(encodedPayload);
  } catch {
    throw new Error(fallbackMessage);
  }
}

function hashUserId(userId) {
  return createHash('sha256').update(normalizeValue(userId)).digest('hex').slice(0, 16);
}

function buildUserSnapshot(user = {}) {
  return {
    avatarUrl: user?.avatarUrl || null,
    email: normalizeEmail(user?.email) || null,
    id: normalizeValue(user?.id) || null,
    name: user?.name || null,
  };
}

export function getTrustedLoginDeviceCookieName(userId) {
  const normalizedUserId = normalizeValue(userId);

  if (!normalizedUserId) {
    return '';
  }

  return `${TRUSTED_DEVICE_COOKIE_PREFIX}${hashUserId(normalizedUserId)}`;
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
  const normalizedEmail = normalizeEmail(email);
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

  const payload = {
    accessToken: normalizedAccessToken,
    deviceHash: normalizedDeviceHash,
    email: normalizedEmail,
    exp: Math.floor(Number(expiresAt) / 1000),
    provider: normalizeValue(provider) || 'password',
    refreshToken: normalizedRefreshToken,
    user: buildUserSnapshot(user),
    userId: normalizedUserId,
  };

  const encodedPayload = encodePayload(payload);
  return `${encodedPayload}.${signPayload(encodedPayload)}`;
}

export function verifyPendingSignInToken(token) {
  const payload = verifyToken(token, 'Pending sign-in session is invalid');
  const expiresAtMs = Number(payload?.exp) * 1000;

  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    throw new Error('Pending sign-in session has expired');
  }

  const user = buildUserSnapshot(payload?.user);

  if (
    !normalizeValue(payload?.userId) ||
    !normalizeEmail(payload?.email) ||
    !normalizeValue(payload?.deviceHash) ||
    !normalizeValue(payload?.accessToken) ||
    !normalizeValue(payload?.refreshToken)
  ) {
    throw new Error('Pending sign-in session is invalid');
  }

  return {
    accessToken: normalizeValue(payload.accessToken),
    deviceHash: normalizeValue(payload.deviceHash),
    email: normalizeEmail(payload.email),
    expiresAt: new Date(expiresAtMs).toISOString(),
    provider: normalizeValue(payload.provider) || 'password',
    refreshToken: normalizeValue(payload.refreshToken),
    user,
    userId: normalizeValue(payload.userId),
  };
}

export function readPendingSignInFromRequest(request) {
  const token = getCookieValue(request, PENDING_SIGN_IN_COOKIE_NAME);

  if (!token) {
    return null;
  }

  return verifyPendingSignInToken(token);
}

export function setPendingSignInCookie(response, token) {
  response.cookies.set(
    PENDING_SIGN_IN_COOKIE_NAME,
    token,
    createCookieOptions({
      maxAge: PENDING_SIGN_IN_MAX_AGE_SECONDS,
      sameSite: 'strict',
    })
  );
}

export function clearPendingSignInCookie(response) {
  response.cookies.set(
    PENDING_SIGN_IN_COOKIE_NAME,
    '',
    createCookieOptions({
      maxAge: 0,
      sameSite: 'strict',
    })
  );
}

export function assertPendingSignIn(request, { deviceHash, email = null } = {}) {
  const pendingSignIn = readPendingSignInFromRequest(request);

  if (!pendingSignIn) {
    throw new Error('Pending sign-in session was not found');
  }

  if (normalizeValue(deviceHash) && pendingSignIn.deviceHash !== normalizeValue(deviceHash)) {
    throw new Error('Pending sign-in session is invalid');
  }

  if (email && pendingSignIn.email !== normalizeEmail(email)) {
    throw new Error('Pending sign-in session is invalid');
  }

  return pendingSignIn;
}

export function createTrustedLoginDeviceToken({
  deviceHash,
  userId,
  expiresAt = Date.now() + TRUSTED_DEVICE_MAX_AGE_MS,
}) {
  const normalizedUserId = normalizeValue(userId);
  const normalizedDeviceHash = normalizeValue(deviceHash);

  if (!normalizedUserId || !normalizedDeviceHash) {
    throw new Error('Trusted device payload is invalid');
  }

  const payload = {
    deviceHash: normalizedDeviceHash,
    exp: Math.floor(Number(expiresAt) / 1000),
    userId: normalizedUserId,
  };

  const encodedPayload = encodePayload(payload);
  return `${encodedPayload}.${signPayload(encodedPayload)}`;
}

export function verifyTrustedLoginDeviceToken(token, { deviceHash, userId }) {
  const payload = verifyToken(token, 'Trusted device token is invalid');
  const expiresAtMs = Number(payload?.exp) * 1000;

  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    throw new Error('Trusted device token has expired');
  }

  if (
    normalizeValue(payload?.userId) !== normalizeValue(userId) ||
    normalizeValue(payload?.deviceHash) !== normalizeValue(deviceHash)
  ) {
    throw new Error('Trusted device token is invalid');
  }

  return true;
}

export function hasTrustedLoginDevice(request, { deviceHash, userId }) {
  const cookieName = getTrustedLoginDeviceCookieName(userId);

  if (!cookieName) {
    return false;
  }

  const token = getCookieValue(request, cookieName);

  if (!token) {
    return false;
  }

  try {
    return verifyTrustedLoginDeviceToken(token, { deviceHash, userId });
  } catch {
    return false;
  }
}

export function setTrustedLoginDeviceCookie(response, { deviceHash, userId }) {
  const cookieName = getTrustedLoginDeviceCookieName(userId);

  if (!cookieName) {
    return;
  }

  response.cookies.set(
    cookieName,
    createTrustedLoginDeviceToken({ deviceHash, userId }),
    createCookieOptions({
      maxAge: TRUSTED_DEVICE_MAX_AGE_SECONDS,
      sameSite: 'lax',
    })
  );
}

export function clearTrustedLoginDeviceCookie(response, userId) {
  const cookieName = getTrustedLoginDeviceCookieName(userId);

  if (!cookieName) {
    return;
  }

  response.cookies.set(
    cookieName,
    '',
    createCookieOptions({
      maxAge: 0,
      sameSite: 'lax',
    })
  );
}
