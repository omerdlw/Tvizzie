'use client';

const AUTH_CSRF_ENDPOINT = '/api/auth/csrf';
const AUTH_CSRF_COOKIE_NAME = 'tvz_auth_csrf';

let csrfRequest = null;

export class AuthRequestError extends Error {
  constructor(payload, fallbackMessage, status = 0) {
    super(payload?.error || payload?.message || fallbackMessage);
    this.name = 'AuthRequestError';
    this.code = payload?.code || null;
    this.data = payload?.data || payload || null;
    this.status = status;
  }
}

function readBrowserCookie(name) {
  if (typeof document === 'undefined') return '';

  const prefix = `${name}=`;
  const entry = String(document.cookie || '')
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix));

  if (!entry) return '';

  try {
    return decodeURIComponent(entry.slice(prefix.length));
  } catch {
    return '';
  }
}

export function getAuthCsrfToken() {
  return readBrowserCookie(AUTH_CSRF_COOKIE_NAME);
}

export function createAuthCsrfHeaders(headers = {}) {
  const csrfToken = getAuthCsrfToken();
  return csrfToken ? { ...headers, 'X-CSRF-Token': csrfToken } : headers;
}

export async function ensureAuthCsrfToken({ force = false } = {}) {
  const existingToken = !force && getAuthCsrfToken();
  if (existingToken) return existingToken;

  if (!force && csrfRequest) return csrfRequest;

  const request = fetch(AUTH_CSRF_ENDPOINT, {
    cache: 'no-store',
    credentials: 'include',
  })
    .then(async (response) => {
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.csrfToken) {
        throw new AuthRequestError(payload, 'CSRF token could not be initialized', response.status);
      }

      return payload.csrfToken;
    })
    .finally(() => {
      if (csrfRequest === request) csrfRequest = null;
    });

  csrfRequest = request;
  return request;
}

export async function requestAuthJson(
  path,
  { body, fallbackMessage = 'Authentication request failed', headers = {}, method = 'POST' } = {},
) {
  const csrfToken = await ensureAuthCsrfToken();
  const response = await fetch(path, {
    method,
    cache: 'no-store',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
      'X-CSRF-Token': csrfToken,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.success === false) {
    throw new AuthRequestError(payload, fallbackMessage, response.status);
  }

  return payload;
}
