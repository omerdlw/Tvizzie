'use client';

import { createBrowserClient } from '@supabase/ssr';
import { createClient as createSupabaseDataClient } from '@supabase/supabase-js';

import {
  combineCookieChunks,
  getCookieChunkBaseName,
  isSupabaseAuthCookieName,
  isSupabaseProjectStorageKey,
  listSupabaseAuthStorageKeys,
  normalizeStorageValue,
  parseSupabaseSessionAccessToken,
} from './auth-storage';
import {
  assertSupabaseBrowserEnv,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_AUTH_COOKIE_OPTIONS,
  SUPABASE_URL,
} from './supabase-constants';

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
  assertSupabaseBrowserEnv();

  if (clientInstance) {
    if (typeof window !== 'undefined' && !window.__SUPABASE_CLIENT__) {
      window.__SUPABASE_CLIENT__ = clientInstance;
    }
    return clientInstance;
  }

  clientInstance = createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      detectSessionInUrl: false,
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

  assertSupabaseBrowserEnv();
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
      await fetch('/api/auth/session', {
        method: 'DELETE',
        credentials: 'include',
        keepalive: true,
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
