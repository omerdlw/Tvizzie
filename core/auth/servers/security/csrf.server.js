import { timingSafeEqual } from 'crypto';

import {
  CSRF_COOKIE_NAME,
  createCsrfToken,
  getCookieValue,
  setCsrfCookie,
} from '@/core/auth/servers/session/session.server';

function normalizeValue(value) {
  return String(value || '').trim();
}

function toBuffer(value) {
  return Buffer.from(normalizeValue(value));
}

export function getCsrfTokenFromCookie(request) {
  return getCookieValue(request, CSRF_COOKIE_NAME);
}

export function getCsrfTokenFromHeader(request) {
  return normalizeValue(request?.headers?.get?.('x-csrf-token') || request?.headers?.get?.('X-CSRF-Token'));
}

export function ensureCsrfCookie(response, csrfToken = '') {
  const normalizedToken = normalizeValue(csrfToken) || createCsrfToken();
  setCsrfCookie(response, normalizedToken);
  return normalizedToken;
}

export function validateCsrfRequest(request) {
  const cookieToken = getCsrfTokenFromCookie(request);
  const headerToken = getCsrfTokenFromHeader(request);

  if (!cookieToken || !headerToken) {
    return false;
  }

  const expected = toBuffer(cookieToken);
  const received = toBuffer(headerToken);

  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function assertCsrfRequest(request) {
  if (!validateCsrfRequest(request)) {
    throw new Error('Invalid CSRF token');
  }
}
