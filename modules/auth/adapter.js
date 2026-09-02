import React from 'react';

import { ApiRequestError, normalizeEmailValue, normalizeValue, requestJson } from '@/shared';

import {
  buildOAuthCallbackUrl,
  DEFAULT_AUTH_ENDPOINTS,
  getOAuthProviderLabel,
  isSupportedOAuthProvider,
  normalizeOAuthProvider,
  resolveAuthCapabilities,
  resolveOAuthIntent,
  resolvePrimaryProvider,
  sanitizeAuthNextPath,
  normalizeSession,
} from './config';

const { useEffect, useState } = React || {};

// Network error normalization keeps the adapter interface independent of the
// shared request implementation and the concrete Supabase error shape.
export class AuthRequestError extends Error {
  constructor(payload, fallbackMessage, status = 0) {
    super(payload?.error || payload?.message || fallbackMessage);
    this.name = 'AuthRequestError';
    this.code = payload?.code || null;
    this.data = payload?.data || payload || null;
    this.status = status;
  }
}

export async function requestAuthJson(
  path,
  { body, fallbackMessage = 'Authentication request failed', headers = {}, method = 'POST' } = {},
) {
  try {
    const payload = await requestJson(path, {
      body,
      fallbackMessage,
      headers,
      method,
      retryCount: 0,
    });

    if (payload?.success === false) {
      throw new AuthRequestError(payload, fallbackMessage, 200);
    }

    return payload;
  } catch (error) {
    if (error instanceof AuthRequestError) throw error;
    if (error instanceof ApiRequestError) {
      throw new AuthRequestError(error.data, fallbackMessage, error.status);
    }
    throw error;
  }
}

// Canonical session reads are shared by all browser auth operations. The
// short TTL coalesces concurrent reads without keeping stale auth state long.
const CANONICAL_SESSION_CACHE_TTL_MS = 1500;
const CANONICAL_SESSION_STATE = {
  expiresAt: 0,
  inFlightPromise: null,
  value: undefined,
};

function createAnonymousSessionPayload() {
  return {
    status: 'anonymous',
    user: null,
  };
}

export function clearCanonicalSessionPayloadCache() {
  CANONICAL_SESSION_STATE.expiresAt = 0;
  CANONICAL_SESSION_STATE.inFlightPromise = null;
  CANONICAL_SESSION_STATE.value = undefined;
}

export async function fetchCanonicalSessionPayload({
  force = false,
  sessionPath = DEFAULT_AUTH_ENDPOINTS.session,
} = {}) {
  const now = Date.now();

  if (
    !force &&
    CANONICAL_SESSION_STATE.value !== undefined &&
    CANONICAL_SESSION_STATE.expiresAt > now
  ) {
    return CANONICAL_SESSION_STATE.value;
  }

  if (!force && CANONICAL_SESSION_STATE.inFlightPromise) {
    return CANONICAL_SESSION_STATE.inFlightPromise;
  }

  const requestPromise = (async () => {
    try {
      const payload =
        (await requestJson(sessionPath, {
          fallbackMessage: 'Session could not be loaded',
          retryCount: 0,
        })) || createAnonymousSessionPayload();

      CANONICAL_SESSION_STATE.value = payload;
      CANONICAL_SESSION_STATE.expiresAt = Date.now() + CANONICAL_SESSION_CACHE_TTL_MS;
      return payload;
    } finally {
      if (CANONICAL_SESSION_STATE.inFlightPromise === requestPromise) {
        CANONICAL_SESSION_STATE.inFlightPromise = null;
      }
    }
  })();

  CANONICAL_SESSION_STATE.inFlightPromise = requestPromise;
  return requestPromise;
}

export async function isCanonicalSessionAuthenticated({ force = false } = {}) {
  try {
    const payload = await fetchCanonicalSessionPayload({ force });
    return payload?.status === 'authenticated' && Boolean(payload?.user?.id);
  } catch {
    return false;
  }
}

const ADAPTER_METHOD_NAMES = Object.freeze([
  'onAuthStateChange',
  'unlinkProvider',
  'signOutOtherSessions',
  'reauthenticate',
  'refreshSession',
  'updateProfile',
  'linkProvider',
  'getSession',
  'signOut',
  'signIn',
  'registerPasskey',
  'listPasskeys',
  'updatePasskey',
  'deletePasskey',
  'listMfaFactors',
  'enrollMfa',
  'challengeMfa',
  'verifyMfa',
  'unenrollMfa',
  'getMfaAssuranceLevel',
  'signUp',
]);

export function createAuthAdapter(adapter = {}) {
  if (!adapter || typeof adapter !== 'object') {
    throw new Error('createAuthAdapter requires a valid adapter object');
  }

  if (typeof adapter.name !== 'string' || !adapter.name.trim()) {
    throw new Error('Auth adapter requires a non-empty string "name"');
  }

  ADAPTER_METHOD_NAMES.forEach((methodName) => {
    const method = adapter[methodName];

    if (method !== undefined && typeof method !== 'function') {
      throw new Error(`Auth adapter method "${methodName}" must be a function`);
    }
  });

  return Object.freeze({ ...adapter });
}

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

function resolveNextPath(payload = {}, fallback = '/') {
  return sanitizeAuthNextPath(payload?.nextPath || payload?.next, fallback);
}

function createRedirectResult() {
  return { requiresRedirect: true };
}

function requirePasskeyMethod(client, methodName) {
  const method = client?.auth?.passkey?.[methodName];
  if (typeof method !== 'function') {
    throw new Error('Passkey authentication is not available in this browser session');
  }
  return method.bind(client.auth.passkey);
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

async function fetchCanonicalSession({
  force = false,
  sessionPath = DEFAULT_AUTH_ENDPOINTS.session,
} = {}) {
  try {
    const payload = await fetchCanonicalSessionPayload({ force, sessionPath });
    return normalizeSessionFromApi(payload);
  } catch (error) {
    throw toAdapterError(error?.data || error, 'Session could not be loaded');
  }
}

function getClient(providedClient = null) {
  if (providedClient) {
    if (typeof providedClient === 'function') {
      return providedClient();
    }
    return providedClient;
  }
  if (typeof window !== 'undefined' && window.__SUPABASE_CLIENT__) {
    return window.__SUPABASE_CLIENT__;
  }
  return providedClient;
}

async function fetchAppAuthJson(path, { body, fallbackError, headers = {} } = {}) {
  try {
    return await requestAuthJson(path, {
      body,
      fallbackMessage: fallbackError,
      headers,
    });
  } catch (error) {
    throw toAdapterError(error, fallbackError);
  }
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
    endpoints: providedEndpoints = DEFAULT_AUTH_ENDPOINTS,
    getOAuthRedirectUrl = null,
    oauthCallbackPath = '/auth/callback',
    oauthDefaultNextPath = '/',
    terminateBrowserSession = null,
  } = options;
  const endpoints = { ...DEFAULT_AUTH_ENDPOINTS, ...providedEndpoints };
  const loadSession = ({ force = false } = {}) =>
    fetchCanonicalSession({ force, sessionPath: endpoints.session });

  async function signInWithOAuthProvider(payload = {}) {
    const client = getClient(providedClient);
    const provider = normalizeOAuthProvider(resolveProviderKey(payload));
    const nextPath = resolveNextPath(payload, oauthDefaultNextPath) || oauthDefaultNextPath;
    const fallbackRedirect = `${window.location.origin}${nextPath}`;
    const oauthIntent = resolveOAuthIntent(payload, provider);
    const providerLabel = getOAuthProviderLabel(provider);

    if (!provider || !isSupportedOAuthProvider(provider)) {
      throw new Error('Unsupported OAuth provider');
    }

    const callbackRedirect = buildOAuthCallbackUrl({
      callbackPath: oauthCallbackPath,
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

    const oauthMethod =
      oauthIntent === 'link' ? client?.auth?.linkIdentity : client?.auth?.signInWithOAuth;
    if (typeof oauthMethod !== 'function') {
      throw new Error(
        oauthIntent === 'link'
          ? 'OAuth identity linking is not available in this browser session'
          : 'OAuth sign-in is not available in this browser session',
      );
    }

    const { data, error } = await oauthMethod.call(client.auth, {
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
        normalizedError.message = `${providerLabel} linking is disabled. Enable "Manual Linking" in Supabase Auth settings, then try again`;
      }

      throw normalizedError;
    }

    if (data?.url && typeof window !== 'undefined') {
      window.location.assign(data.url);
    }

    return createRedirectResult();
  }

  async function signInWithPasskey() {
    const client = getClient(providedClient);
    const passkeySignIn = client?.auth?.signInWithPasskey;

    if (typeof passkeySignIn !== 'function') {
      throw new Error('Passkey sign-in is not available in this browser session');
    }

    const { data, error } = await passkeySignIn.call(client.auth);
    if (error) {
      throw toAdapterError(error, 'Passkey sign-in failed');
    }

    clearCanonicalSessionPayloadCache();
    const nextSession = (await loadSession({ force: true })) || data?.session || data || null;
    await requestAuthJson(endpoints.securityEvents, {
      body: { event: 'passkey-sign-in', deviceLabel: 'this device' },
      fallbackMessage: 'Security event could not be recorded',
    }).catch(() => {});
    return nextSession;
  }

  async function registerPasskey() {
    const client = getClient(providedClient);
    const register = client?.auth?.registerPasskey;

    if (typeof register !== 'function') {
      throw new Error('Passkey registration is not available in this browser session');
    }

    const { data, error } = await register.call(client.auth);
    if (error) {
      throw toAdapterError(error, 'Passkey registration failed');
    }

    return data || null;
  }

  async function listPasskeys() {
    const client = getClient(providedClient);
    const list = requirePasskeyMethod(client, 'list');
    const { data, error } = await list();

    if (error) {
      throw toAdapterError(error, 'Passkeys could not be loaded');
    }

    return Array.isArray(data) ? data : Array.isArray(data?.passkeys) ? data.passkeys : [];
  }

  async function updatePasskey(payload = {}) {
    const client = getClient(providedClient);
    const update = requirePasskeyMethod(client, 'update');
    const { data, error } = await update({
      friendlyName: normalizeValue(payload.friendlyName),
      passkeyId: normalizeValue(payload.passkeyId),
    });

    if (error) {
      throw toAdapterError(error, 'Passkey could not be renamed');
    }

    return data || null;
  }

  async function deletePasskey(payload = {}) {
    const client = getClient(providedClient);
    const remove = requirePasskeyMethod(client, 'delete');
    const { data, error } = await remove({
      passkeyId: normalizeValue(payload.passkeyId),
    });

    if (error) {
      throw toAdapterError(error, 'Passkey could not be removed');
    }

    return data || null;
  }

  function requireMfaMethod(client, methodName) {
    const method = client?.auth?.mfa?.[methodName];
    if (typeof method !== 'function') {
      throw new Error('MFA is not available in this browser session');
    }
    return method.bind(client.auth.mfa);
  }

  async function listMfaFactors() {
    const client = getClient(providedClient);
    const list = requireMfaMethod(client, 'listFactors');
    const { data, error } = await list();
    if (error) throw toAdapterError(error, 'MFA factors could not be loaded');
    const factors = [...(data?.totp || []), ...(data?.phone || [])];
    return factors.map((factor) => ({
      createdAt: factor.created_at || null,
      friendlyName: normalizeValue(factor.friendly_name) || 'Authenticator app',
      id: factor.id,
      status: factor.status,
      type: factor.factor_type || 'totp',
      updatedAt: factor.updated_at || null,
    }));
  }

  async function enrollMfa(payload = {}) {
    const client = getClient(providedClient);
    const enroll = client?.auth?.mfa?.enroll;
    if (typeof enroll !== 'function') throw new Error('MFA enrollment is not available');
    const friendlyName = normalizeValue(payload.friendlyName);
    const { data, error } = await enroll.call(client.auth.mfa, {
      factorType: 'totp',
      ...(friendlyName ? { friendlyName } : {}),
    });
    if (error) throw toAdapterError(error, 'MFA enrollment could not be started');
    return {
      factorId: data?.id || data?.factor?.id || null,
      qrCode: data?.totp?.qr_code || null,
      secret: data?.totp?.secret || null,
      uri: data?.totp?.uri || null,
    };
  }

  async function challengeMfa(payload = {}) {
    const challenge = requireMfaMethod(getClient(providedClient), 'challenge');
    const { data, error } = await challenge({ factorId: normalizeValue(payload.factorId) });
    if (error) throw toAdapterError(error, 'MFA challenge could not be created');
    return { challengeId: data?.id || data?.challengeId || null };
  }

  async function verifyMfa(payload = {}) {
    const verify = requireMfaMethod(getClient(providedClient), 'verify');
    const { data, error } = await verify({
      challengeId: normalizeValue(payload.challengeId),
      code: normalizeValue(payload.code),
      factorId: normalizeValue(payload.factorId),
    });
    if (error) throw toAdapterError(error, 'MFA code could not be verified');
    return data || null;
  }

  async function unenrollMfa(payload = {}) {
    const unenroll = requireMfaMethod(getClient(providedClient), 'unenroll');
    const { data, error } = await unenroll({ factorId: normalizeValue(payload.factorId) });
    if (error) throw toAdapterError(error, 'MFA factor could not be removed');
    return data || null;
  }

  async function getMfaAssuranceLevel() {
    const getLevel = requireMfaMethod(getClient(providedClient), 'getAuthenticatorAssuranceLevel');
    const { data, error } = await getLevel();
    if (error) throw toAdapterError(error, 'MFA assurance level could not be loaded');
    return data || null;
  }

  return createAuthAdapter({
    name: 'supabase',

    async getSession() {
      return loadSession();
    },

    async refreshSession() {
      clearCanonicalSessionPayloadCache();
      return loadSession({ force: true });
    },

    async signIn(payload = {}) {
      const providerKey = resolveProviderKey(payload);

      if (providerKey === 'passkey') {
        return signInWithPasskey();
      }

      if (providerKey === 'mfa-primary') {
        return fetchAppAuthJson(endpoints.mfaPrimary, {
          fallbackError: 'Authenticator verification failed',
          body: { code: normalizeValue(payload.code) },
        });
      }

      if (isSupportedOAuthProvider(providerKey)) {
        return signInWithOAuthProvider(payload);
      }

      const result = await fetchAppAuthJson(endpoints.signIn, {
        fallbackError: 'Sign in failed',
        body: {
          email: normalizeEmailValue(payload.email),
          preferredMethod: normalizeValue(payload.preferredMethod),
        },
      });

      clearCanonicalSessionPayloadCache();

      if (result?.requiresMfa || result?.requiresVerification) {
        return result;
      }

      return loadSession({ force: true });
    },

    registerPasskey,
    listPasskeys,
    updatePasskey,
    deletePasskey,
    listMfaFactors,
    enrollMfa,
    challengeMfa,
    verifyMfa,
    unenrollMfa,
    getMfaAssuranceLevel,

    async signUp(payload = {}) {
      const providerKey = resolveProviderKey(payload);

      if (isSupportedOAuthProvider(providerKey)) {
        return signInWithOAuthProvider(payload);
      }

      throw new Error('Email sign-up must be completed through the verification flow');
    },

    async signOut(_context = {}, options = {}) {
      const mode = normalizeValue(options?.mode).toLowerCase();
      const terminateSession = terminateBrowserSession || (() => Promise.resolve());

      if (mode === 'local-purge') {
        await terminateSession({
          clearServer: true,
          performNetworkSignOut: false,
        });

        clearCanonicalSessionPayloadCache();
        return null;
      }

      try {
        await terminateSession({
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
      return loadSession({ force: true });
    },

    async reauthenticate(payload = {}, adapterContext = {}) {
      await fetchAppAuthJson(endpoints.account, {
        fallbackError: 'Reauthentication failed',
        body: {
          action: 'reauthenticate',
          verification: payload.verification || null,
        },
      });

      clearCanonicalSessionPayloadCache();
      const nextSession = await loadSession({ force: true });

      return nextSession || adapterContext?.session || null;
    },

    async linkProvider(payload = {}) {
      const providerKey = resolveProviderKey(payload);

      if (!isSupportedOAuthProvider(providerKey)) {
        throw new Error('Only supported OAuth provider linking is currently supported');
      }

      return signInWithOAuthProvider({ ...payload, oauthIntent: 'link' });
    },

    async unlinkProvider(payload = {}) {
      const providerKey = resolveProviderKey(payload);
      const provider = normalizeOAuthProvider(providerKey);

      if (!provider || !isSupportedOAuthProvider(provider)) {
        throw new Error('Only supported OAuth provider unlinking is currently supported');
      }

      const client = getClient(providedClient);
      if (!client?.auth?.getUserIdentities || !client?.auth?.unlinkIdentity) {
        throw new Error('Provider unlinking is not available in this browser session');
      }

      const { data, error: identitiesError } = await client.auth.getUserIdentities();
      if (identitiesError) {
        throw toAdapterError(identitiesError, 'Connected sign-in methods could not be loaded');
      }

      const identities = Array.isArray(data?.identities) ? data.identities : [];
      const identity = identities.find(
        (candidate) => normalizeOAuthProvider(candidate?.provider) === provider,
      );

      if (!identity) {
        throw new Error(`${getOAuthProviderLabel(provider)} is not connected to this account`);
      }

      if (identities.length < 2) {
        throw new Error('Keep at least one sign-in method connected to this account');
      }

      const { error } = await client.auth.unlinkIdentity(identity);
      if (error) {
        const normalizedError = toAdapterError(
          error,
          `${getOAuthProviderLabel(provider)} could not be disconnected`,
        );

        if (isManualLinkingDisabledError(error)) {
          normalizedError.code = 'OAUTH_UNLINK_MANUAL_LINKING_DISABLED';
          normalizedError.message = `${getOAuthProviderLabel(provider)} disconnecting is disabled. Enable "Manual Linking" in Supabase Auth settings, then try again`;
        }

        throw normalizedError;
      }

      clearCanonicalSessionPayloadCache();
      return loadSession({ force: true });
    },

    async signOutOtherSessions() {
      await fetchAppAuthJson(endpoints.signOutOtherSessions, {
        body: {},
        fallbackError: 'Other sessions could not be signed out',
      });
      clearCanonicalSessionPayloadCache();
      return loadSession({ force: true });
    },

    onAuthStateChange(callback) {
      const client = getClient(providedClient);
      const subscriptionResult = client?.auth?.onAuthStateChange?.((event, session) => {
        if (!session) {
          if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
            clearCanonicalSessionPayloadCache();
            callback(null);
          }
          return;
        }

        clearCanonicalSessionPayloadCache();
        loadSession({ force: true })
          .then((nextSession) => callback(nextSession))
          .catch(() => callback(null));
      });

      return () => {
        subscriptionResult?.data?.subscription?.unsubscribe?.();
        subscriptionResult?.subscription?.unsubscribe?.();
      };
    },
  });
}

export function isPasskeyFeatureEnabled() {
  return String(process.env.NEXT_PUBLIC_SUPABASE_PASSKEY_ENABLED || '').toLowerCase() === 'true';
}

export function isPasskeyBrowserSupported() {
  return Boolean(
    typeof window !== 'undefined' &&
    window.PublicKeyCredential &&
    typeof navigator !== 'undefined' &&
    navigator.credentials?.get &&
    navigator.credentials?.create,
  );
}

export function usePasskeySupport() {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(isPasskeyFeatureEnabled() && isPasskeyBrowserSupported());
  }, []);

  return isSupported;
}
