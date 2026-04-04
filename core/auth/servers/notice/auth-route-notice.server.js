import { AUTH_ROUTE_NOTICE_COOKIE_NAME, normalizeAuthRouteNotice } from '@/core/auth/route-notice';
import { AUTH_COOKIE_PATH, isSecureCookieEnvironment } from '@/core/auth/servers/session/session.server';

const AUTH_ROUTE_NOTICE_MAX_AGE_SECONDS = 60;

export function setAuthRouteNoticeCookie(response, notice) {
  const normalizedNotice = normalizeAuthRouteNotice(notice);

  if (!normalizedNotice) {
    return;
  }

  response.cookies.set(AUTH_ROUTE_NOTICE_COOKIE_NAME, normalizedNotice, {
    httpOnly: false,
    maxAge: AUTH_ROUTE_NOTICE_MAX_AGE_SECONDS,
    path: AUTH_COOKIE_PATH,
    sameSite: 'lax',
    secure: isSecureCookieEnvironment(),
  });
}

export function clearAuthRouteNoticeCookie(response) {
  response.cookies.set(AUTH_ROUTE_NOTICE_COOKIE_NAME, '', {
    httpOnly: false,
    maxAge: 0,
    path: AUTH_COOKIE_PATH,
    sameSite: 'lax',
    secure: isSecureCookieEnvironment(),
  });
}
