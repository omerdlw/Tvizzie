'use client';

import { AUTH_ROUTE_NOTICE_COOKIE_NAME, normalizeAuthRouteNotice } from '@/core/auth/route-notice';

function expireNoticeCookie() {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${AUTH_ROUTE_NOTICE_COOKIE_NAME}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

export function consumeAuthRouteNoticeCookie() {
  if (typeof document === 'undefined') {
    return '';
  }

  const prefix = `${AUTH_ROUTE_NOTICE_COOKIE_NAME}=`;
  const cookieEntry = String(document.cookie || '')
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(prefix));

  if (!cookieEntry) {
    return '';
  }

  expireNoticeCookie();

  return normalizeAuthRouteNotice(decodeURIComponent(cookieEntry.slice(prefix.length)));
}
