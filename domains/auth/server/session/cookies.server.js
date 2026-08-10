import 'server-only';
import { randomBytes } from 'crypto';
import { normalizeValue } from '@/shared/utils';
import { createSupabaseResponseClient } from '@/infrastructure/supabase/response-client.server';
import {
  listSupabaseAuthStorageKeys,
  listSupabaseRequestStorageKeys,
} from '@/infrastructure/supabase/auth-storage';
import {
  AUTH_COOKIE_PATH,
  CSRF_COOKIE_NAME,
  LEGACY_CSRF_COOKIE_NAME,
  STEP_UP_COOKIE_NAME,
  STEP_UP_MAX_AGE_MS,
  STEP_UP_MAX_AGE_SECONDS,
} from '@/domains/auth/utils';

const DEVICE_ID_COOKIE_NAME = 'tvz_device_id';
const DEVICE_ID_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export {
  AUTH_COOKIE_PATH,
  CSRF_COOKIE_NAME,
  STEP_UP_COOKIE_NAME,
  STEP_UP_MAX_AGE_MS,
  STEP_UP_MAX_AGE_SECONDS,
};

export function isSecureCookieEnvironment() {
  return process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false';
}

export function getCookieValue(request, cookieName) {
  const cookieHeader = normalizeValue(request?.headers?.get?.('cookie'));
  if (!cookieHeader) return '';

  const prefix = `${cookieName}=`;
  const cookie = cookieHeader
    .split(';')
    .map(normalizeValue)
    .find((entry) => entry.startsWith(prefix));

  if (!cookie) return '';

  try {
    return decodeURIComponent(cookie.slice(prefix.length));
  } catch {
    return '';
  }
}

export function createCsrfToken() {
  return randomBytes(32).toString('base64url');
}

function setCookie(response, name, value, options) {
  response.cookies.set(name, value, {
    path: AUTH_COOKIE_PATH,
    sameSite: 'lax',
    secure: isSecureCookieEnvironment(),
    ...options,
  });
}

export function setCsrfCookie(response, token) {
  const normalizedToken = normalizeValue(token);
  if (!normalizedToken) return;
  setCookie(response, CSRF_COOKIE_NAME, normalizedToken, { httpOnly: false, maxAge: 86400 });
}

export function clearCsrfCookie(response) {
  setCookie(response, CSRF_COOKIE_NAME, '', { httpOnly: false, maxAge: 0 });
}

function getRequestStorageCookieNames(request) {
  if (typeof request?.cookies?.getAll === 'function') {
    return listSupabaseRequestStorageKeys(request.cookies.getAll());
  }

  return listSupabaseRequestStorageKeys(
    normalizeValue(request?.headers?.get?.('cookie'))
      .split(';')
      .flatMap((entry) => {
        const separatorIndex = entry.indexOf('=');
        return separatorIndex > 0 ? [{ name: entry.slice(0, separatorIndex) }] : [];
      }),
  );
}

export function clearAuthCookies(response, request = null) {
  clearCsrfCookie(response);
  const names = new Set([
    LEGACY_CSRF_COOKIE_NAME,
    'sb-access-token',
    'sb-refresh-token',
    ...getRequestStorageCookieNames(request),
    ...listSupabaseAuthStorageKeys().flatMap((name) => [
      name,
      ...Array.from({ length: 64 }, (_, index) => `${name}.${index}`),
    ]),
  ]);

  names.forEach((name) => setCookie(response, name, '', { httpOnly: true, maxAge: 0 }));
}

export function setDeviceIdCookie(response, deviceId) {
  const normalizedDeviceId = normalizeValue(deviceId);
  if (!normalizedDeviceId) return;
  setCookie(response, DEVICE_ID_COOKIE_NAME, normalizedDeviceId, {
    httpOnly: true,
    maxAge: DEVICE_ID_MAX_AGE_SECONDS,
  });
}

export function buildNormalizedSession(session, user) {
  if (!session?.access_token) return null;
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token || null,
    expiresAt: session.expires_at || null,
    user: user || session.user || null,
  };
}

export async function applySupabaseSessionToResponse(
  request,
  response,
  { accessToken, refreshToken },
) {
  const normalizedAccessToken = normalizeValue(accessToken);
  const normalizedRefreshToken = normalizeValue(refreshToken);
  if (!normalizedAccessToken || !normalizedRefreshToken) {
    throw new Error('A complete authentication session is required');
  }

  const result = await createSupabaseResponseClient(request, response).auth.setSession({
    access_token: normalizedAccessToken,
    refresh_token: normalizedRefreshToken,
  });

  if (result.error || !result.data?.session?.access_token) {
    throw new Error(result.error?.message || 'Authentication session could not be established');
  }

  return buildNormalizedSession(result.data.session, result.data.user || null);
}
