import { resolveAuthCapabilities } from '@/core/auth/capabilities';
import { createCsrfHeaders } from '@/core/auth/clients/csrf.client';
import {
  buildOAuthCallbackUrl,
  resolveOAuthIntent,
  sanitizeAuthNextPath,
} from '@/core/auth/oauth-callback';
import { getOAuthProviderLabel, isSupportedOAuthProvider, normalizeOAuthProvider } from '@/core/auth/oauth-providers';
import { createClient as createSupabaseClient, terminateBrowserSession } from '@/core/clients/supabase/client';

import { createAuthAdapter } from './create-adapter';

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeEmail(value) {
  return normalizeValue(value).toLowerCase();
}

function resolveProviderKey(payload = {}) {
  const provider = payload?.provider || payload?.strategy || payload?.authProvider || null;

  return normalizeValue(provider).toLowerCase();
}

function resolveNextPath(payload = {}) {
  return sanitizeAuthNextPath(payload?.nextPath || payload?.next, '/account');
}

function createRedirectResult() {
  return {
    requiresRedirect: true,
  };
}

function isManualLinkingDisabledError(error) {
  const message = normalizeValue(error?.message || error?.msg || error?.error_description || '').toLowerCase();
  const code = normalizeValue(error?.code || error?.error_code).toLowerCase();

  if (!message && !code) {
    return false;
  }

  return (
    message.includes('manual linking is disabled') ||
    (code === 'validation_failed' && message.includes('manual linking'))
  );
}

function isIgnorableLogoutError(error) {
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
    message.includes('refresh token not found') ||
    message.includes('request timed out') ||
    message.includes('timed out') ||
    message.includes('timeout') ||
    message.includes('network request failed') ||
    message.includes('failed to fetch') ||
    message.includes('fetch failed')
  );
}

function toAdapterError(error, fallbackMessage) {
  const message = normalizeValue(error?.message || error?.msg || error?.error_description || error?.error);

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
    ...resolveAuthCapabilities({
      providerIds,
      email,
    }),
    ...(value && typeof value === 'object' ? value : {}),
  };
}

function normalizeSessionFromApi(payload = {}) {
  const status = normalizeValue(payload?.status).toLowerCase();

  if (status !== 'authenticated' || !payload?.user?.id) {
    return null;
  }

  const capabilities = normalizeAuthCapabilityState(payload?.capabilities, payload?.user?.email || null);
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

const CANONICAL_SESSION_CACHE_TTL_MS = 1500;
const CANONICAL_SESSION_STATE = {
  expiresAt: 0,
  inFlightPromise: null,
  value: undefined,
};

function clearCanonicalSessionCache() {
  CANONICAL_SESSION_STATE.expiresAt = 0;
  CANONICAL_SESSION_STATE.inFlightPromise = null;
  CANONICAL_SESSION_STATE.value = undefined;
}

async function fetchCanonicalSession({ force = false } = {}) {
  const now = Date.now();

  if (!force && CANONICAL_SESSION_STATE.value !== undefined && CANONICAL_SESSION_STATE.expiresAt > now) {
    return CANONICAL_SESSION_STATE.value;
  }

  if (!force && CANONICAL_SESSION_STATE.inFlightPromise) {
    return CANONICAL_SESSION_STATE.inFlightPromise;
  }

  const requestPromise = Promise.resolve()
    .then(async () => {
      const response = await fetch('/api/auth/session', {
        cache: 'no-store',
        credentials: 'include',
      });
      const payload = await response.json().catch(() => ({ status: 'anonymous', user: null }));

      if (!response.ok) {
        throw toAdapterError(payload, 'Session could not be loaded');
      }

      return normalizeSessionFromApi(payload);
    })
    .then((session) => {
      CANONICAL_SESSION_STATE.value = session;
      CANONICAL_SESSION_STATE.expiresAt = Date.now() + CANONICAL_SESSION_CACHE_TTL_MS;
      CANONICAL_SESSION_STATE.inFlightPromise = null;
      return session;
    })
    .catch((error) => {
      CANONICAL_SESSION_STATE.inFlightPromise = null;
      throw error;
    });

  CANONICAL_SESSION_STATE.inFlightPromise = requestPromise;
  return requestPromise;
}

function getClient(providedClient = null) {
  return providedClient || createSupabaseClient();
}

export function createSupabaseAuthAdapter(options = {}) {
  const { client: providedClient = null, getOAuthRedirectUrl = null, oauthDefaultNextPath = '/account' } = options;

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
        ? getOAuthRedirectUrl({
            intent: oauthIntent,
            nextPath,
            provider,
          }) ||
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
        normalizedError.message =
          `${providerLabel} linking is disabled. Enable "Manual Linking" in Supabase Auth settings, then try again.`;
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
      const client = getClient(providedClient);
      const { error } = await client.auth.getSession();

      if (error) {
        throw toAdapterError(error, 'Session refresh failed');
      }

      clearCanonicalSessionCache();
      return fetchCanonicalSession({ force: true });
    },

    async signIn(payload = {}) {
      const providerKey = resolveProviderKey(payload);

      if (isSupportedOAuthProvider(providerKey)) {
        return signInWithOAuthProvider(payload);
      }

      const client = getClient(providedClient);
      const { error } = await client.auth.signInWithPassword({
        email: normalizeEmail(payload.email),
        password: String(payload.password || ''),
      });

      if (error) {
        throw toAdapterError(error, 'Sign in failed');
      }

      clearCanonicalSessionCache();
      return fetchCanonicalSession({ force: true });
    },

    async signUp(payload = {}) {
      const providerKey = resolveProviderKey(payload);

      if (isSupportedOAuthProvider(providerKey)) {
        return signInWithOAuthProvider(payload);
      }

      throw new Error('Password sign-up must be completed through the application email verification flow');
    },

    async signOut(adapterContext = {}, options = {}) {
      void adapterContext;

      const mode = normalizeValue(options?.mode).toLowerCase();

      if (mode === 'local-purge') {
        await terminateBrowserSession({
          clearServer: true,
          performNetworkSignOut: false,
        });

        clearCanonicalSessionCache();
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
          clearCanonicalSessionCache();
          return null;
        }

        throw toAdapterError(error, 'Sign out failed');
      }

      clearCanonicalSessionCache();
      return null;
    },

    async updateProfile(payload = {}) {
      const client = getClient(providedClient);
      const profilePatch = {};

      if (payload.displayName !== undefined) {
        profilePatch.display_name = normalizeValue(payload.displayName) || null;
        profilePatch.full_name = normalizeValue(payload.displayName) || null;
        profilePatch.name = normalizeValue(payload.displayName) || null;
      }

      if (payload.avatarUrl !== undefined || payload.photoURL !== undefined) {
        profilePatch.avatar_url = normalizeValue(payload.avatarUrl || payload.photoURL) || null;
      }

      const { error } = await client.auth.updateUser({
        data: profilePatch,
      });

      if (error) {
        throw toAdapterError(error, 'Profile update failed');
      }

      clearCanonicalSessionCache();
      return fetchCanonicalSession({ force: true });
    },

    async reauthenticate(payload = {}, adapterContext = {}) {
      void adapterContext;

      const response = await fetch('/api/auth/account/reauthenticate', {
        method: 'POST',
        credentials: 'include',
        headers: {
          ...createCsrfHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: String(payload.password || ''),
        }),
      });

      const result = await response.json().catch(() => ({ error: 'Reauthentication failed' }));

      if (!response.ok) {
        throw toAdapterError(result, 'Reauthentication failed');
      }

      clearCanonicalSessionCache();
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

      const error = new Error('Google unlink is currently disabled while account linking is being stabilized.');
      error.code = 'GOOGLE_UNLINK_DISABLED';
      throw error;
    },

    async requestPasswordReset(payload = {}) {
      void payload;

      throw new Error('Password reset requests must be completed through the application email verification flow');
    },

    async confirmPasswordReset(payload = {}) {
      const client = getClient(providedClient);
      const { error } = await client.auth.updateUser({
        password: String(payload.newPassword || payload.password || ''),
      });

      if (error) {
        throw toAdapterError(error, 'Password reset confirmation failed');
      }

      clearCanonicalSessionCache();
      return fetchCanonicalSession({ force: true });
    },

    onAuthStateChange(callback) {
      const client = getClient(providedClient);
      const {
        data: { subscription },
      } = client.auth.onAuthStateChange((event, session) => {
        if (!session) {
          if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
            clearCanonicalSessionCache();
            callback(null);
          }

          return;
        }

        clearCanonicalSessionCache();
        Promise.resolve(fetchCanonicalSession({ force: true }))
          .then((nextSession) => {
            callback(nextSession);
          })
          .catch(() => {
            callback(null);
          });
      });

      return () => {
        subscription?.unsubscribe?.();
      };
    },
  });
}
