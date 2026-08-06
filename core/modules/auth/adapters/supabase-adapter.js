'use client';

import { normalizeEmailValue, normalizeValue } from '@/shared/utils';
import {
  buildOAuthCallbackUrl,
  createCsrfHeaders,
  getOAuthProviderLabel,
  isSupportedOAuthProvider,
  normalizeOAuthProvider,
  resolveAuthCapabilities,
  resolveOAuthIntent,
  sanitizeAuthNextPath,
} from '../provider-utils';
import {
  clearCanonicalSessionPayloadCache,
  fetchCanonicalSessionPayload,
} from '../session-client';

import { createAuthAdapter } from './create-adapter';

const IGNORABLE_LOGOUT_CODES = new Set(['bad_jwt', 'refresh_token_not_found', 'session_not_found']);
const IGNORABLE_LOGOUT_ERROR_PATTERNS = [
  'failed to fetch',
  'fetch failed',
  'invalid jwt',
  'invalid number of segments',
  'network request failed',
  'refresh token not found',
  'request timed out',
  'session not found',
  'timeout',
  'timed out',
  'token is malformed',
];

function resolveProviderKey(payload = {}) {
  const provider = payload?.provider || payload?.strategy || payload?.authProvider || null;
  return normalizeValue(provider).toLowerCase();
}

function resolveNextPath(payload = {}) {
  return sanitizeAuthNextPath(payload?.nextPath || payload?.next, '/account');
}

function createRedirectResult() {
  return { requiresRedirect: true };
}

function isManualLinkingDisabledError(error) {
  const message = normalizeValue(
    error?.message || error?.msg || error?.error_description || '',
  ).toLowerCase();
  const code = normalizeValue(error?.code || error?.error_code).toLowerCase();

  if (!message && !code) return false;

  return (
    message.includes('manual linking is disabled') ||
    (code === 'validation_failed' && message.includes('manual linking'))
  );
}

function isIgnorableLogoutError(error) {
  const message = normalizeValue(
    error?.message || error?.msg || error?.error_description || '',
  ).toLowerCase();
  const code = normalizeValue(error?.code || error?.error_code).toLowerCase();

  return (
    IGNORABLE_LOGOUT_CODES.has(code) ||
    IGNORABLE_LOGOUT_ERROR_PATTERNS.some((pattern) => message.includes(pattern))
  );
}

function toAdapterError(error, fallbackMessage) {
  const message = normalizeValue(
    error?.message || error?.msg || error?.error_description || error?.error,
  );

  const normalized = new Error(message || fallbackMessage || 'Supabase auth failed');
  normalized.name = error?.name || 'SupabaseAuthError';
  normalized.code = normalizeValue(error?.code || error?.error_code) || null;
  normalized.status = Number(error?.status) || 0;
  normalized.data = error || null;

  return normalized;
}

function normalizeAuthCapabilityState(value = {}, email = null) {
  const providerIds = Array.isArray(value?.providerIds) ? value.providerIds : [];

  return {
    ...resolveAuthCapabilities({ providerIds, email }),
    ...(value && typeof value === 'object' ? value : {}),
  };
}

function normalizeSessionFromApi(payload = {}) {
  const status = normalizeValue(payload?.status).toLowerCase();

  if (status !== 'authenticated' || !payload?.user?.id) {
    return null;
  }

  const capabilities = normalizeAuthCapabilityState(
    payload?.capabilities,
    payload?.user?.email || null,
  );

  const metadata = {
    ...(payload?.user?.metadata || {}),
    authCapabilities: capabilities,
  };

  return {
    capabilities,
    expiresAt: payload?.expiresAt || null,
    metadata,
    provider: capabilities.primaryProvider || null,
    user: {
      ...payload.user,
      metadata,
    },
  };
}

async function fetchCanonicalSession({ force = false } = {}) {
  try {
    const payload = await fetchCanonicalSessionPayload({ force });
    return normalizeSessionFromApi(payload);
  } catch (error) {
    throw toAdapterError(error?.data || error, 'Session could not be loaded');
  }
}

function getClient(providedClient = null) {
  if (providedClient) return providedClient;
  if (typeof window !== 'undefined' && window.__SUPABASE_CLIENT__) {
    return window.__SUPABASE_CLIENT__;
  }
  return providedClient;
}

async function fetchAppAuthJson(path, { body, fallbackError, headers = {} } = {}) {
  const response = await fetch(path, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body || {}),
  });

  const result = await response.json().catch(() => ({ error: fallbackError }));

  if (!response.ok) {
    throw toAdapterError(result, fallbackError);
  }

  return result;
}

function createProfilePatch(payload = {}) {
  const profilePatch = {};
  const displayName = normalizeValue(payload.displayName);

  if (payload.displayName !== undefined) {
    profilePatch.display_name = displayName || null;
    profilePatch.full_name = displayName || null;
    profilePatch.name = displayName || null;
  }

  if (payload.avatarUrl !== undefined || payload.photoURL !== undefined) {
    profilePatch.avatar_url = normalizeValue(payload.avatarUrl || payload.photoURL) || null;
  }

  return profilePatch;
}

export function createSupabaseAuthAdapter(options = {}) {
  const {
    client: providedClient = null,
    getOAuthRedirectUrl = null,
    oauthDefaultNextPath = '/account',
  } = options;

  async function signInWithOAuthProvider(payload = {}) {
    const client = getClient(providedClient);
    const provider = normalizeOAuthProvider(resolveProviderKey(payload));
    const nextPath = resolveNextPath(payload) || oauthDefaultNextPath;
    const fallbackRedirect = `${window.location.origin}${nextPath}`;
    const oauthIntent = resolveOAuthIntent(payload, provider);
    const providerLabel = getOAuthProviderLabel(provider);

    if (!provider || !isSupportedOAuthProvider(provider)) {
      throw new Error('Unsupported OAuth provider');
    }

    const callbackRedirect = buildOAuthCallbackUrl({
      intent: oauthIntent,
      nextPath,
      origin: window.location.origin,
      provider,
    });

    const redirectTo =
      typeof getOAuthRedirectUrl === 'function'
        ? getOAuthRedirectUrl({ intent: oauthIntent, nextPath, provider }) ||
          callbackRedirect ||
          fallbackRedirect
        : callbackRedirect || fallbackRedirect;

    const { data, error } = await client.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      const normalizedError = toAdapterError(error, `${providerLabel} sign-in failed`);

      if (oauthIntent === 'link' && isManualLinkingDisabledError(error)) {
        normalizedError.code = 'OAUTH_LINK_MANUAL_LINKING_DISABLED';
        normalizedError.message = `${providerLabel} linking is disabled. Enable "Manual Linking" in Supabase Auth settings, then try again.`;
      }

      throw normalizedError;
    }

    if (data?.url && typeof window !== 'undefined') {
      window.location.assign(data.url);
    }

    return createRedirectResult();
  }

  return createAuthAdapter({
    name: 'supabase',

    async getSession() {
      return fetchCanonicalSession();
    },

    async refreshSession() {
      clearCanonicalSessionPayloadCache();
      return fetchCanonicalSession({ force: true });
    },

    async signIn(payload = {}) {
      const providerKey = resolveProviderKey(payload);

      if (isSupportedOAuthProvider(providerKey)) {
        return signInWithOAuthProvider(payload);
      }

      const result = await fetchAppAuthJson('/api/auth/sign-in', {
        fallbackError: 'Sign in failed',
        body: {
          identifier: String(payload.identifier || '').trim() || undefined,
          email: normalizeEmailValue(payload.email),
          password: String(payload.password || ''),
        },
      });

      clearCanonicalSessionPayloadCache();

      if (result?.requiresVerification) {
        return result;
      }

      return fetchCanonicalSession({ force: true });
    },

    async signUp(payload = {}) {
      const providerKey = resolveProviderKey(payload);

      if (isSupportedOAuthProvider(providerKey)) {
        return signInWithOAuthProvider(payload);
      }

      throw new Error(
        'Password sign-up must be completed through the application email verification flow',
      );
    },

    async signOut(_context = {}, options = {}) {
      const mode = normalizeValue(options?.mode).toLowerCase();

      if (mode === 'local-purge') {
        await terminateBrowserSession({
          clearServer: true,
          performNetworkSignOut: false,
        });

        clearCanonicalSessionPayloadCache();
        return null;
      }

      try {
        await terminateBrowserSession({
          clearServer: true,
          performNetworkSignOut: true,
          scope: mode === 'local' ? 'local' : 'global',
        });
      } catch (error) {
        if (isIgnorableLogoutError(error)) {
          clearCanonicalSessionPayloadCache();
          return null;
        }

        throw toAdapterError(error, 'Sign out failed');
      }

      clearCanonicalSessionPayloadCache();
      return null;
    },

    async updateProfile(payload = {}) {
      const client = getClient(providedClient);

      const { error } = await client.auth.updateUser({
        data: createProfilePatch(payload),
      });

      if (error) {
        throw toAdapterError(error, 'Profile update failed');
      }

      clearCanonicalSessionPayloadCache();
      return fetchCanonicalSession({ force: true });
    },

    async reauthenticate(payload = {}, adapterContext = {}) {
      await fetchAppAuthJson('/api/auth/account', {
        fallbackError: 'Reauthentication failed',
        headers: createCsrfHeaders(),
        body: {
          action: 'reauthenticate',
          currentPassword: String(payload.password || ''),
        },
      });

      clearCanonicalSessionPayloadCache();
      const nextSession = await fetchCanonicalSession({ force: true });

      return nextSession || adapterContext?.session || null;
    },

    async linkProvider(payload = {}) {
      const providerKey = resolveProviderKey(payload);

      if (!isSupportedOAuthProvider(providerKey)) {
        throw new Error('Only supported OAuth provider linking is currently supported');
      }

      return signInWithOAuthProvider(payload);
    },

    async unlinkProvider(payload = {}) {
      const providerKey = resolveProviderKey(payload);

      if (providerKey !== 'google') {
        throw new Error('Only Google provider unlinking is currently supported');
      }

      const error = new Error(
        'Google unlink is currently disabled while account linking is being stabilized.',
      );
      error.code = 'GOOGLE_UNLINK_DISABLED';
      throw error;
    },

    async requestPasswordReset() {
      throw new Error(
        'Password reset requests must be completed through the application email verification flow',
      );
    },

    async confirmPasswordReset(payload = {}) {
      const client = getClient(providedClient);
      const { error } = await client.auth.updateUser({
        password: String(payload.newPassword || payload.password || ''),
      });

      if (error) {
        throw toAdapterError(error, 'Password reset confirmation failed');
      }

      clearCanonicalSessionPayloadCache();
      return fetchCanonicalSession({ force: true });
    },

    onAuthStateChange(callback) {
      const client = getClient(providedClient);
      const {
        data: { subscription },
      } = client.auth.onAuthStateChange((event, session) => {
        if (!session) {
          if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
            clearCanonicalSessionPayloadCache();
            callback(null);
          }
          return;
        }

        clearCanonicalSessionPayloadCache();
        fetchCanonicalSession({ force: true })
          .then((nextSession) => callback(nextSession))
          .catch(() => callback(null));
      });

      return () => {
        subscription?.unsubscribe?.();
      };
    },
  });
}
