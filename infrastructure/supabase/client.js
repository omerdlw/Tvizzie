import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseDataClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { normalizeValue, requestJson } from '@/shared';

const DAYS_PER_MONTH = 30;
const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;

export const SUPABASE_URL = normalizeValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
export const SUPABASE_PUBLISHABLE_KEY = normalizeValue(
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
export const SUPABASE_PASSKEY_ENABLED =
  normalizeValue(process.env.NEXT_PUBLIC_SUPABASE_PASSKEY_ENABLED).toLowerCase() === 'true';

export const SUPABASE_AUTH_INACTIVITY_TIMEOUT_SECONDS =
  DAYS_PER_MONTH * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE;

export const SUPABASE_AUTH_COOKIE_OPTIONS = Object.freeze({
  maxAge: SUPABASE_AUTH_INACTIVITY_TIMEOUT_SECONDS,
  path: '/',
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false',
});

export function assertSupabasePublicEnv() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      'Supabase browser environment is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    );
  }
}

const SUPABASE_COOKIE_CHUNK_SUFFIX_PATTERN = /^(.*)\.(\d+)$/;
const SUPABASE_AUTH_TOKEN_SUFFIX = '-auth-token';
const SUPABASE_STORAGE_PREFIX = 'sb-';
const SUPABASE_BASE64_PREFIX = 'base64-';

export function normalizeStorageValue(value) {
  return String(value || '').trim();
}

export function resolveSupabaseProjectRef() {
  try {
    const hostname = new URL(SUPABASE_URL).hostname;
    return normalizeStorageValue(hostname.split('.')[0] || '');
  } catch {
    return '';
  }
}

export function listSupabaseAuthStorageKeys() {
  const projectRef = resolveSupabaseProjectRef();

  if (!projectRef) {
    return [];
  }

  const base = `${SUPABASE_STORAGE_PREFIX}${projectRef}${SUPABASE_AUTH_TOKEN_SUFFIX}`;

  return [base, `${base}-code-verifier`, `${base}-user`];
}

export function isSupabaseProjectStorageKey(key) {
  const normalizedKey = normalizeStorageValue(key);
  const projectRef = resolveSupabaseProjectRef();

  return Boolean(
    normalizedKey &&
    normalizedKey.startsWith(SUPABASE_STORAGE_PREFIX) &&
    (!projectRef || normalizedKey.startsWith(`${SUPABASE_STORAGE_PREFIX}${projectRef}-`)),
  );
}

export function isSupabaseAuthCookieName(name) {
  const baseName = getCookieChunkBaseName(name);
  return (
    baseName.startsWith(SUPABASE_STORAGE_PREFIX) && baseName.endsWith(SUPABASE_AUTH_TOKEN_SUFFIX)
  );
}

export function listSupabaseRequestStorageKeys(cookies = []) {
  return Array.from(
    new Set(
      (Array.isArray(cookies) ? cookies : [])
        .map((cookie) => normalizeStorageValue(cookie?.name))
        .filter(isSupabaseProjectStorageKey),
    ),
  );
}

export function getCookieChunkBaseName(cookieName) {
  const normalizedName = normalizeStorageValue(cookieName);
  const match = normalizedName.match(SUPABASE_COOKIE_CHUNK_SUFFIX_PATTERN);

  if (!match?.[1]) {
    return normalizedName;
  }

  return normalizeStorageValue(match[1]);
}

export function combineCookieChunks(cookieMap, cookieName) {
  const directValue = normalizeStorageValue(cookieMap.get(cookieName));

  if (directValue) {
    return directValue;
  }

  const chunks = [];

  for (let index = 0; index < 64; index += 1) {
    const chunkValue = normalizeStorageValue(cookieMap.get(`${cookieName}.${index}`));

    if (!chunkValue) {
      break;
    }

    chunks.push(chunkValue);
  }

  return chunks.length > 0 ? chunks.join('') : '';
}

export function decodeBase64UrlToString(value) {
  const normalizedValue = normalizeStorageValue(value);

  if (!normalizedValue) {
    return '';
  }

  const base64 = normalizedValue.replace(/-/g, '+').replace(/_/g, '/');
  const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');

  try {
    const binary = atob(paddedBase64);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return '';
  }
}

function decodeSupabaseCookiePayload(value) {
  const normalizedValue = normalizeStorageValue(value);

  if (!normalizedValue) {
    return '';
  }

  if (!normalizedValue.startsWith(SUPABASE_BASE64_PREFIX)) {
    return normalizedValue;
  }

  const encodedValue = normalizeStorageValue(normalizedValue.slice(SUPABASE_BASE64_PREFIX.length));

  return encodedValue ? decodeBase64UrlToString(encodedValue) : '';
}

export function parseSupabaseSessionAccessToken(cookieValue) {
  const decodedPayload = decodeSupabaseCookiePayload(cookieValue);

  if (!decodedPayload) {
    return '';
  }

  let parsedPayload;

  try {
    parsedPayload = JSON.parse(decodedPayload);
  } catch {
    return '';
  }

  if (Array.isArray(parsedPayload)) {
    return normalizeStorageValue(parsedPayload[0]);
  }

  if (!parsedPayload || typeof parsedPayload !== 'object') {
    return '';
  }

  return normalizeStorageValue(
    parsedPayload?.access_token ||
      parsedPayload?.session?.access_token ||
      parsedPayload?.currentSession?.access_token,
  );
}



let clientInstance = null;
let dataClientAccessToken = null;
let dataClientInstance = null;

export function getBrowserSupabaseAccessToken() {
  if (typeof document === 'undefined') return '';

  const cookieMap = new Map();
  const sessionCookieNames = new Set();

  String(document.cookie || '')
    .split(';')
    .forEach((entry) => {
      const separatorIndex = entry.indexOf('=');
      if (separatorIndex <= 0) return;

      const name = normalizeStorageValue(entry.slice(0, separatorIndex));
      if (!name) return;

      let value = entry.slice(separatorIndex + 1).trim();
      try {
        value = decodeURIComponent(value);
      } catch {}

      cookieMap.set(name, normalizeStorageValue(value));
      const baseName = getCookieChunkBaseName(name);
      if (isSupabaseAuthCookieName(baseName)) sessionCookieNames.add(baseName);
    });

  for (const cookieName of sessionCookieNames) {
    const accessToken = parseSupabaseSessionAccessToken(combineCookieChunks(cookieMap, cookieName));
    if (accessToken) return accessToken;
  }

  return '';
}

function expireBrowserCookie(name) {
  if (typeof document === 'undefined' || !name) {
    return;
  }

  document.cookie = `${name}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

function removeStorageKey(storage, key) {
  try {
    storage?.removeItem?.(key);
  } catch {}
}

function purgeMatchingStorageEntries(storage, matcher) {
  try {
    const keys = [];

    for (let index = 0; index < (storage?.length || 0); index += 1) {
      const key = storage.key(index);

      if (matcher(key)) {
        keys.push(key);
      }
    }

    keys.forEach((key) => storage.removeItem(key));
  } catch {}
}

function isIgnorableSignOutError(error) {
  const message = normalizeStorageValue(
    error?.message || error?.msg || error?.error_description || '',
  ).toLowerCase();
  const code = normalizeStorageValue(error?.code || error?.error_code).toLowerCase();

  return (
    code === 'bad_jwt' ||
    code === 'session_not_found' ||
    code === 'refresh_token_not_found' ||
    message.includes('invalid jwt') ||
    message.includes('token is malformed') ||
    message.includes('invalid number of segments') ||
    message.includes('session not found') ||
    message.includes('refresh token not found')
  );
}

export function createClient() {
  assertSupabasePublicEnv();

  if (clientInstance) {
    if (typeof window !== 'undefined' && !window.__SUPABASE_CLIENT__) {
      window.__SUPABASE_CLIENT__ = clientInstance;
    }
    return clientInstance;
  }

  clientInstance = createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      detectSessionInUrl: false,
      experimental: {
        passkey: SUPABASE_PASSKEY_ENABLED,
      },
      flowType: 'pkce',
      multiTab: false,
    },
    cookieOptions: SUPABASE_AUTH_COOKIE_OPTIONS,
  });

  if (typeof window !== 'undefined') {
    window.__SUPABASE_CLIENT__ = clientInstance;
  }

  return clientInstance;
}

export function createAuthenticatedDataClient() {
  const accessToken = getBrowserSupabaseAccessToken();

  if (!accessToken) {
    return createClient();
  }

  if (dataClientInstance && dataClientAccessToken === accessToken) {
    return dataClientInstance;
  }

  assertSupabasePublicEnv();
  dataClientAccessToken = accessToken;
  dataClientInstance = createSupabaseDataClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    accessToken: async () => accessToken,
  });
  return dataClientInstance;
}

export async function clearBrowserSupabaseAuthState({ clearServer = true } = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  const cookieNames = new Set(listSupabaseAuthStorageKeys());

  normalizeStorageValue(document.cookie)
    .split(';')
    .map((entry) => normalizeStorageValue(entry).split('=')[0])
    .filter(Boolean)
    .forEach((name) => {
      if (isSupabaseProjectStorageKey(name)) {
        cookieNames.add(name);
      }
    });

  cookieNames.forEach((name) => expireBrowserCookie(name));

  const exactStorageKeys = new Set(listSupabaseAuthStorageKeys());

  exactStorageKeys.forEach((key) => {
    removeStorageKey(window.localStorage, key);
    removeStorageKey(window.sessionStorage, key);
  });

  purgeMatchingStorageEntries(window.localStorage, (key) => {
    return isSupabaseProjectStorageKey(key);
  });

  purgeMatchingStorageEntries(window.sessionStorage, (key) => {
    return isSupabaseProjectStorageKey(key);
  });

  if (clearServer) {
    try {
      await requestJson('/api/auth/session', {
        method: 'DELETE',
        keepalive: true,
        retryCount: 0,
      });
    } catch {}
  }

  clientInstance = null;
  dataClientAccessToken = null;
  dataClientInstance = null;
}

export async function terminateBrowserSession({
  clearServer = true,
  performNetworkSignOut = true,
  scope = 'global',
} = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  const client = clientInstance || (performNetworkSignOut ? createClient() : null);

  let signOutError = null;

  if (performNetworkSignOut && client?.auth?.signOut) {
    try {
      if (scope === 'local') {
        await client.auth.signOut({ scope: 'local' });
      } else {
        await client.auth.signOut();
      }
    } catch (error) {
      if (!isIgnorableSignOutError(error)) {
        signOutError = error;
      }
    }
  }

  await clearBrowserSupabaseAuthState({
    clearServer,
  });

  if (signOutError) {
    throw signOutError;
  }
}

export async function forceClearBrowserSupabaseAuthState() {
  await clearBrowserSupabaseAuthState({
    clearServer: true,
  });
}

const CSRF_COOKIE_NAME = 'tvz_auth_csrf';
const CSRF_MAX_AGE_SECONDS = 12 * 60 * 60;

function resolveTimeoutMs(value, fallback) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

const SUPABASE_PROXY_TIMEOUT_MS = resolveTimeoutMs(process.env.SUPABASE_PROXY_TIMEOUT_MS, 3500);
const SUPABASE_PROXY_REFRESH_BUFFER_MS = resolveTimeoutMs(
  process.env.SUPABASE_PROXY_REFRESH_BUFFER_MS,
  5 * 60 * 1000,
);

let lastClaimsErrorLogAt = 0;

function isSecureCookieEnvironment() {
  return process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false';
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
  return crypto.randomUUID();
}

function applySupabaseResponseHeaders(response, headers = {}) {
  Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
}

export async function updateSession(request) {
  assertSupabasePublicEnv();

  let supabaseResponse = NextResponse.next({
    request,
  });

  if (shouldRefreshSession(request)) {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      cookieOptions: SUPABASE_AUTH_COOKIE_OPTIONS,
      global: {
        fetch: async (input, init = {}) => {
          const { signal, cleanup, didTimeout } = createTimeoutSignal(
            init?.signal,
            SUPABASE_PROXY_TIMEOUT_MS,
          );

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
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          applySupabaseResponseHeaders(supabaseResponse, headers);
        },
      },
    });

    try {
      await supabase.auth.getClaims();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production' && shouldLogClaimsError()) {
        const reason =
          error?.cause?.code || error?.code || error?.cause?.message || error?.message || 'unknown';
        console.warn(`[supabase-proxy] getClaims skipped: ${reason}`);
      }
    }
  }

  const existingCsrf =
    request.cookies.get(CSRF_COOKIE_NAME)?.value ||
    supabaseResponse.cookies.get(CSRF_COOKIE_NAME)?.value ||
    '';

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

