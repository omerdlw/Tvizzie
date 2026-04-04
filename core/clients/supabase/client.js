'use client';

import { createBrowserClient } from '@supabase/ssr';

import { assertSupabaseBrowserEnv, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './constants';

if (typeof window !== 'undefined') {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('supabase.auth.getSession()') && args[0].includes('insecure')) {
      return;
    }
    originalWarn(...args);
  };
}

let clientInstance = null;

function normalizeValue(value) {
  return String(value || '').trim();
}

function resolveProjectRef() {
  try {
    const hostname = new URL(SUPABASE_URL).hostname;
    return normalizeValue(hostname.split('.')[0] || '');
  } catch {
    return '';
  }
}

function listBrowserAuthStorageKeys() {
  const projectRef = resolveProjectRef();

  if (!projectRef) {
    return [];
  }

  const base = `sb-${projectRef}-auth-token`;

  return [base, `${base}-code-verifier`, `${base}-user`];
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
  } catch {
    // Best-effort cleanup only.
  }
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
  } catch {
    // Best-effort cleanup only.
  }
}

function isIgnorableSignOutError(error) {
  const message = normalizeValue(error?.message || error?.msg || error?.error_description || '').toLowerCase();
  const code = normalizeValue(error?.code || error?.error_code).toLowerCase();

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
    return clientInstance;
  }

  clientInstance = createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      flowType: 'pkce',
      multiTab: false,
    },
  });
  return clientInstance;
}

export async function clearBrowserSupabaseAuthState({ clearServer = true } = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  const projectRef = resolveProjectRef();
  const cookieNames = new Set(listBrowserAuthStorageKeys());

  normalizeValue(document.cookie)
    .split(';')
    .map((entry) => normalizeValue(entry).split('=')[0])
    .filter(Boolean)
    .forEach((name) => {
      if (name.startsWith('sb-') && (!projectRef || name.startsWith(`sb-${projectRef}-`))) {
        cookieNames.add(name);
      }
    });

  cookieNames.forEach((name) => expireBrowserCookie(name));

  const exactStorageKeys = new Set(listBrowserAuthStorageKeys());

  exactStorageKeys.forEach((key) => {
    removeStorageKey(window.localStorage, key);
    removeStorageKey(window.sessionStorage, key);
  });

  purgeMatchingStorageEntries(window.localStorage, (key) => {
    const normalizedKey = normalizeValue(key);

    return Boolean(
      normalizedKey && normalizedKey.startsWith('sb-') && (!projectRef || normalizedKey.startsWith(`sb-${projectRef}-`))
    );
  });

  purgeMatchingStorageEntries(window.sessionStorage, (key) => {
    const normalizedKey = normalizeValue(key);

    return Boolean(
      normalizedKey && normalizedKey.startsWith('sb-') && (!projectRef || normalizedKey.startsWith(`sb-${projectRef}-`))
    );
  });

  if (clearServer) {
    try {
      await fetch('/api/auth/session', {
        method: 'DELETE',
        credentials: 'include',
        keepalive: true,
      });
    } catch {
      // Best-effort cleanup only.
    }
  }

  clientInstance = null;
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

  if (performNetworkSignOut && client?.auth?.signOut) {
    try {
      if (scope === 'local') {
        await client.auth.signOut({ scope: 'local' });
      } else {
        await client.auth.signOut();
      }
    } catch (error) {
      if (!isIgnorableSignOutError(error)) {
        throw error;
      }
    }
  }

  await clearBrowserSupabaseAuthState({
    clearServer,
  });
}

export async function forceClearBrowserSupabaseAuthState() {
  await clearBrowserSupabaseAuthState({
    clearServer: true,
  });
}
