import { normalizeEmailValue, normalizeValue } from '@/core/utils/string';
import { createHash } from 'crypto';

import { AUTH_COOKIE_PATH, getCookieValue, isSecureCookieEnvironment } from '../session/session.server';

import {
  PENDING_SIGN_IN_COOKIE_NAME,
  PENDING_SIGN_IN_MAX_AGE_MS,
  PENDING_SIGN_IN_MAX_AGE_SECONDS,
  TRUSTED_DEVICE_COOKIE_PREFIX,
  TRUSTED_DEVICE_MAX_AGE_MS,
  TRUSTED_DEVICE_MAX_AGE_SECONDS,
} from './login-verification.constants';
import { resolveSecretWithFallback } from './secret-fallback.server';
import { createSignedToken, verifySignedToken } from './signed-token.server';

function createCookieOptions({ maxAge, sameSite = 'lax' }) {
  return {
    httpOnly: true,
    maxAge,
    path: AUTH_COOKIE_PATH,
    sameSite,
    secure: isSecureCookieEnvironment(),
  };
}

function getSecret() {
  return resolveSecretWithFallback({
    primaryEnvName: 'LOGIN_VERIFICATION_SECRET',
    fallbackEnvNames: ['STEP_UP_SECRET', 'EMAIL_VERIFICATION_SECRET'],
    missingMessage: 'LOGIN_VERIFICATION_SECRET is missing and no fallback secret is available',
    warningGlobalKey: '__tvizzie_login_verification_secret_fallback_warned__',
    warningMessage:
      '[Auth] LOGIN_VERIFICATION_SECRET is missing. Falling back to STEP_UP_SECRET or EMAIL_VERIFICATION_SECRET.',
  });
}

function hashUserId(userId) {
  return createHash('sha256').update(normalizeValue(userId)).digest('hex').slice(0, 16);
}

function buildUserSnapshot(user = {}) {
  return {
    avatarUrl: user?.avatarUrl || null,
    email: normalizeEmailValue(user?.email) || null,
    id: normalizeValue(user?.id) || null,
    name: user?.name || null,
  };
}

function assertPendingSignInPayload(payload = {}) {
  if (
    !normalizeValue(payload?.userId) ||
    !normalizeEmailValue(payload?.email) ||
    !normalizeValue(payload?.deviceHash) ||
    !normalizeValue(payload?.accessToken) ||
    !normalizeValue(payload?.refreshToken)
  ) {
    throw new Error('Pending sign-in session is invalid');
  }
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
      user: buildUserSnapshot(user),
      userId: normalizedUserId,
    },
    {
      secret: getSecret(),
    }
  );
}

export function verifyPendingSignInToken(token) {
  const payload = verifySignedToken(token, {
    invalidMessage: 'Pending sign-in session is invalid',
    secret: getSecret(),
  });
  const expiresAtMs = Number(payload?.exp) * 1000;

  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    throw new Error('Pending sign-in session has expired');
  }

  assertPendingSignInPayload(payload);

  return {
    accessToken: normalizeValue(payload.accessToken),
    deviceHash: normalizeValue(payload.deviceHash),
    email: normalizeEmailValue(payload.email),
    expiresAt: new Date(expiresAtMs).toISOString(),
    provider: normalizeValue(payload.provider) || 'password',
    refreshToken: normalizeValue(payload.refreshToken),
    user: buildUserSnapshot(payload?.user),
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

  if (email && pendingSignIn.email !== normalizeEmailValue(email)) {
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

  return createSignedToken(
    {
      deviceHash: normalizedDeviceHash,
      exp: Math.floor(Number(expiresAt) / 1000),
      userId: normalizedUserId,
    },
    { secret: getSecret() }
  );
}

export function verifyTrustedLoginDeviceToken(token, { deviceHash, userId }) {
  const payload = verifySignedToken(token, {
    invalidMessage: 'Trusted device token is invalid',
    secret: getSecret(),
  });
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
