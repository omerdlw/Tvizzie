import { randomBytes } from 'crypto';

import {
  AUTH_COOKIE_PATH,
  CSRF_COOKIE_NAME,
  LEGACY_CSRF_COOKIE_NAME,
} from './session.constants';
import {
  getCookieHeaderValue,
  getRequestCookies,
  listSupabaseAuthCookieNames,
} from './session.cookies.server';
import { normalizeValue } from './session.shared';

export function getCookieValue(request, cookieName) {
  const directValue = request?.cookies?.get?.(cookieName)?.value;

  if (directValue) {
    return normalizeValue(directValue);
  }

  const cookieHeader = getCookieHeaderValue(request);

  if (!cookieHeader) {
    return '';
  }

  const prefix = `${cookieName}=`;

  for (const item of cookieHeader.split(';')) {
    const normalizedItem = normalizeValue(item);

    if (normalizedItem.startsWith(prefix)) {
      return normalizeValue(decodeURIComponent(normalizedItem.slice(prefix.length)));
    }
  }

  return '';
}

export function isSecureCookieEnvironment() {
  return process.env.NODE_ENV === 'production';
}

function createCookieOptions({ httpOnly = true, maxAge, sameSite = 'lax' }) {
  return {
    httpOnly,
    maxAge,
    path: AUTH_COOKIE_PATH,
    sameSite,
    secure: isSecureCookieEnvironment(),
  };
}

export function setCsrfCookie(response, csrfToken) {
  response.cookies.set(
    CSRF_COOKIE_NAME,
    csrfToken,
    createCookieOptions({
      httpOnly: false,
      maxAge: 12 * 60 * 60,
      sameSite: 'lax',
    })
  );
}

export function clearCsrfCookie(response) {
  response.cookies.set(
    CSRF_COOKIE_NAME,
    '',
    createCookieOptions({
      httpOnly: false,
      maxAge: 0,
      sameSite: 'lax',
    })
  );

  response.cookies.set(
    LEGACY_CSRF_COOKIE_NAME,
    '',
    createCookieOptions({
      httpOnly: false,
      maxAge: 0,
      sameSite: 'lax',
    })
  );
}

export function applySessionCookies(response, { csrfToken } = {}) {
  if (normalizeValue(csrfToken)) {
    setCsrfCookie(response, csrfToken);
  }
}

function expireCookie(response, cookieName, { httpOnly = true } = {}) {
  response.cookies.delete(cookieName);
  response.cookies.set(cookieName, '', {
    httpOnly,
    maxAge: 0,
    expires: new Date(0),
    path: AUTH_COOKIE_PATH,
    sameSite: 'lax',
    secure: isSecureCookieEnvironment(),
  });
}

export function clearAuthCookies(response, request = null) {
  clearCsrfCookie(response);
  expireCookie(response, 'tvz_session', { httpOnly: true });

  for (const cookieName of listSupabaseAuthCookieNames(request)) {
    expireCookie(response, cookieName, { httpOnly: true });
    expireCookie(response, cookieName, { httpOnly: false });
  }
}

export function createCsrfToken() {
  return randomBytes(32).toString('base64url');
}

export function hasRequestCookies(request) {
  const requestCookies = getRequestCookies(request);
  return Array.isArray(requestCookies) && requestCookies.length > 0;
}
