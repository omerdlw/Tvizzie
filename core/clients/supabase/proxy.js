import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

import {
  combineCookieChunks,
  decodeBase64UrlToString,
  getCookieChunkBaseName,
  isSupabaseAuthCookieName,
  normalizeStorageValue,
  parseSupabaseSessionAccessToken,
} from './auth-storage';
import { assertSupabaseBrowserEnv, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './constants';

const CSRF_COOKIE_NAME = 'tvz_auth_csrf';
const CSRF_MAX_AGE_SECONDS = 12 * 60 * 60;

function resolveTimeoutMs(value, fallback) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

const SUPABASE_PROXY_TIMEOUT_MS = resolveTimeoutMs(process.env.SUPABASE_PROXY_TIMEOUT_MS, 3500);
const SUPABASE_PROXY_REFRESH_BUFFER_MS = resolveTimeoutMs(process.env.SUPABASE_PROXY_REFRESH_BUFFER_MS, 5 * 60 * 1000);

let lastClaimsErrorLogAt = 0;

function isSecureCookieEnvironment() {
  return process.env.NODE_ENV === 'production';
}

function decodeAccessTokenExpirationMs(accessToken) {
  const normalizedToken = normalizeStorageValue(accessToken);

  if (!normalizedToken) {
    return 0;
  }

  const parts = normalizedToken.split('.');

  if (parts.length < 2) {
    return 0;
  }

  try {
    const payload = JSON.parse(decodeBase64UrlToString(parts[1]));
    const expiresAtSeconds = Number(payload?.exp || 0);

    if (!Number.isFinite(expiresAtSeconds) || expiresAtSeconds <= 0) {
      return 0;
    }

    return expiresAtSeconds * 1000;
  } catch {
    return 0;
  }
}

function hasAuthSessionCookie(request) {
  return request.cookies.getAll().some(({ name }) => isSupabaseAuthCookieName(name));
}

function readAccessTokenFromRequestCookies(request) {
  const requestCookies = request.cookies.getAll() || [];

  if (!requestCookies.length) {
    return '';
  }

  const cookieMap = new Map();
  const candidateCookieNames = new Set();

  requestCookies.forEach(({ name, value }) => {
    const normalizedName = normalizeStorageValue(name);

    if (!normalizedName) {
      return;
    }

    cookieMap.set(normalizedName, normalizeStorageValue(value));

    const baseName = getCookieChunkBaseName(normalizedName);

    if (isSupabaseAuthCookieName(baseName)) {
      candidateCookieNames.add(baseName);
    }
  });

  for (const cookieName of candidateCookieNames) {
    const cookieValue = combineCookieChunks(cookieMap, cookieName);
    const accessToken = parseSupabaseSessionAccessToken(cookieValue);

    if (accessToken) {
      return accessToken;
    }
  }

  return '';
}

function shouldRefreshSession(request) {
  if (!hasAuthSessionCookie(request)) {
    return false;
  }

  const accessToken = readAccessTokenFromRequestCookies(request);

  if (!accessToken) {
    return true;
  }

  const expiresAtMs = decodeAccessTokenExpirationMs(accessToken);

  if (!expiresAtMs) {
    return true;
  }

  return expiresAtMs <= Date.now() + SUPABASE_PROXY_REFRESH_BUFFER_MS;
}

function createTimeoutSignal(parentSignal, timeoutMs) {
  const controller = new AbortController();
  let didTimeout = false;

  const timerId = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, timeoutMs);

  const onParentAbort = () => {
    controller.abort();
  };

  if (parentSignal) {
    if (parentSignal.aborted) {
      controller.abort(parentSignal.reason);
    } else {
      parentSignal.addEventListener('abort', onParentAbort, { once: true });
    }
  }

  return {
    signal: controller.signal,
    didTimeout() {
      return didTimeout;
    },
    cleanup() {
      clearTimeout(timerId);
      if (parentSignal) {
        parentSignal.removeEventListener('abort', onParentAbort);
      }
    },
  };
}

function shouldLogClaimsError() {
  const now = Date.now();
  if (now - lastClaimsErrorLogAt < 10000) {
    return false;
  }

  lastClaimsErrorLogAt = now;
  return true;
}

function createCsrfToken() {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
}

export async function updateSession(request) {
  assertSupabaseBrowserEnv();

  let supabaseResponse = NextResponse.next({
    request,
  });

  if (shouldRefreshSession(request)) {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: {
        fetch: async (input, init = {}) => {
          const { signal, cleanup, didTimeout } = createTimeoutSignal(init?.signal, SUPABASE_PROXY_TIMEOUT_MS);

          try {
            return await fetch(input, {
              ...init,
              signal,
            });
          } catch (error) {
            if (didTimeout()) {
              return new Response(JSON.stringify({ error: 'supabase-proxy-timeout' }), {
                status: 504,
                headers: { 'content-type': 'application/json' },
              });
            }

            throw error;
          } finally {
            cleanup();
          }
        },
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    });

    try {
      await supabase.auth.getClaims();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production' && shouldLogClaimsError()) {
        const reason = error?.cause?.code || error?.code || error?.cause?.message || error?.message || 'unknown';
        console.warn(`[supabase-proxy] getClaims skipped: ${reason}`);
      }
    }
  }

  const existingCsrf =
    request.cookies.get(CSRF_COOKIE_NAME)?.value || supabaseResponse.cookies.get(CSRF_COOKIE_NAME)?.value || '';

  if (!existingCsrf) {
    supabaseResponse.cookies.set(CSRF_COOKIE_NAME, createCsrfToken(), {
      httpOnly: false,
      maxAge: CSRF_MAX_AGE_SECONDS,
      path: '/',
      sameSite: 'lax',
      secure: isSecureCookieEnvironment(),
    });
  }

  return supabaseResponse;
}
