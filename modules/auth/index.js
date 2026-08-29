import React from 'react';

const createContext =
  typeof React?.createContext === 'function'
    ? React.createContext.bind(React)
    : (defaultValue) => ({
        Provider: ({ children }) => children,
        Consumer: null,
        _currentValue: defaultValue,
      });

const {
  useCallback,
  useContext,
  useEffect,
  useState,
  useMemo,
  useRef,
} = React || {};

import { ApiRequestError, requestJson } from '@/shared';
import { EVENT_TYPES, globalEvents } from '@/shared';
import { normalizeEmailValue, normalizeLowerValue, normalizeValue } from '@/shared';

export const GITHUB_PROVIDER_ID = 'github';
export const GOOGLE_PROVIDER_ID = 'google.com';
export const X_PROVIDER_ID = 'x';
export const EMAIL_PROVIDER_ID = 'email';
export const PASSKEY_PROVIDER_ID = 'passkey';

const DISABLED_PROVIDER_ALIASES = Object.freeze(['apple', 'apple.com']);

export const OAUTH_PROVIDER_CONFIG = Object.freeze({
  github: Object.freeze({
    icon: 'mdi:github',
    id: GITHUB_PROVIDER_ID,
    key: 'github',
    label: 'GitHub',
  }),
  google: Object.freeze({
    icon: 'flat-color-icons:google',
    id: GOOGLE_PROVIDER_ID,
    key: 'google',
    label: 'Google',
  }),
  x: Object.freeze({
    icon: 'simple-icons:x',
    id: X_PROVIDER_ID,
    key: 'x',
    label: 'X',
  }),
});

export const PASSKEY_PROVIDER_CONFIG = Object.freeze({
  icon: 'solar:key-bold',
  id: PASSKEY_PROVIDER_ID,
  key: PASSKEY_PROVIDER_ID,
  label: 'Passkey',
});

const OAUTH_PROVIDER_ALIASES = Object.freeze({
  github: 'github',
  'github.com': 'github',
  google: 'google',
  'google.com': 'google',
  x: 'x',
  'x.com': 'x',
  twitter: 'x',
  'twitter.com': 'x',
});

const AUTH_REDIRECT_BASE_ORIGIN = 'https://tvizzie.local';
const AUTH_BLOCKED_NEXT_PATHS = new Set([
  '/api/auth/callback',
  '/auth/callback',
  '/auth/oauth-callback',
  '/callback',
  '/sign-in',
  '/sign-up',
]);
const OAUTH_INTENTS = new Set(['link', 'sign-in', 'sign-up']);

export const OAUTH_PROVIDER_KEYS = Object.freeze(Object.keys(OAUTH_PROVIDER_CONFIG));

function toArray(value) {
  if (Array.isArray(value)) return value;
  return value === undefined || value === null || value === '' ? [] : [value];
}

export function uniqueStrings(items) {
  return Array.from(new Set(toArray(items).map(normalizeValue).filter(Boolean)));
}

export function normalizeOAuthProvider(value) {
  return OAUTH_PROVIDER_ALIASES[normalizeLowerValue(value)] || null;
}

export function isSupportedOAuthProvider(value) {
  return Boolean(normalizeOAuthProvider(value));
}

export function getOAuthProviderConfig(value) {
  return OAUTH_PROVIDER_CONFIG[normalizeOAuthProvider(value)] || null;
}

export function getAuthProviderConfig(value) {
  const normalizedValue = normalizeLowerValue(value);
  if (normalizedValue === PASSKEY_PROVIDER_ID) return PASSKEY_PROVIDER_CONFIG;
  return getOAuthProviderConfig(normalizedValue);
}

export function getOAuthProviderId(value) {
  return getOAuthProviderConfig(value)?.id || null;
}

export function getOAuthProviderLabel(value, fallback = 'OAuth') {
  return getOAuthProviderConfig(value)?.label || fallback;
}

export function normalizeProviderId(value) {
  const normalizedValue = normalizeLowerValue(value);
  if (!normalizedValue || DISABLED_PROVIDER_ALIASES.includes(normalizedValue)) return null;
  if (normalizedValue === 'email' || normalizedValue === 'password') {
    return EMAIL_PROVIDER_ID;
  }

  return getOAuthProviderId(normalizedValue) || normalizedValue;
}

export function getEnabledOAuthProviderIds(providerIds = []) {
  return toArray(providerIds)
    .map(normalizeProviderId)
    .filter((providerId) => providerId && providerId !== EMAIL_PROVIDER_ID);
}

export function resolvePrimaryProvider(providerIds = []) {
  const normalizedProviderIds = uniqueStrings(
    toArray(providerIds).map(normalizeProviderId).filter(Boolean),
  );

  if (normalizedProviderIds.includes(EMAIL_PROVIDER_ID)) return EMAIL_PROVIDER_ID;
  if (normalizedProviderIds.includes(GOOGLE_PROVIDER_ID)) return 'google';
  if (normalizedProviderIds.includes(GITHUB_PROVIDER_ID)) return 'github';
  if (normalizedProviderIds.includes(X_PROVIDER_ID)) return 'x';

  return normalizeOAuthProvider(normalizedProviderIds[0]) || normalizedProviderIds[0] || null;
}

export function resolveAuthCapabilities({ providerIds = [], email = null } = {}) {
  const resolvedProviderIds = uniqueStrings(
    toArray(providerIds).map(normalizeProviderId).filter(Boolean),
  );
  const oauthProviderIds = getEnabledOAuthProviderIds(resolvedProviderIds);
  const oauthEnabled = oauthProviderIds.length > 0;

  return {
    oauthEnabled,
    oauthProviderIds,
    googleEnabled: resolvedProviderIds.includes(GOOGLE_PROVIDER_ID),
    githubEnabled: resolvedProviderIds.includes(GITHUB_PROVIDER_ID),
    xEnabled: resolvedProviderIds.includes(X_PROVIDER_ID),
    primaryProvider: resolvePrimaryProvider(resolvedProviderIds),
  };
}

export function sanitizeAuthNextPath(nextPath, fallback = '/account') {
  const rawValue = normalizeValue(nextPath);
  if (!rawValue || !rawValue.startsWith('/') || /^https?:\/\//i.test(rawValue)) return fallback;

  try {
    const parsed = new URL(rawValue, AUTH_REDIRECT_BASE_ORIGIN);
    if (
      parsed.origin !== AUTH_REDIRECT_BASE_ORIGIN ||
      AUTH_BLOCKED_NEXT_PATHS.has(parsed.pathname)
    ) {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function normalizeOAuthIntent(value, fallback = 'sign-in') {
  const intent = normalizeLowerValue(value);
  return OAUTH_INTENTS.has(intent) ? intent : fallback;
}

export function resolveOAuthIntent(payload = {}, provider = null, fallback = 'sign-in') {
  const normalizedProvider = normalizeOAuthProvider(provider);
  return normalizeOAuthIntent(
    payload?.oauthIntent ||
      (normalizedProvider ? payload?.[`${normalizedProvider}AuthIntent`] : null) ||
      payload?.googleAuthIntent,
    fallback,
  );
}

export function buildOAuthCallbackUrl({
  intent = 'sign-in',
  nextPath = '/account',
  origin,
  provider,
} = {}) {
  const normalizedOrigin = origin ? new URL(origin).origin : '';
  const normalizedProvider = normalizeOAuthProvider(provider);
  if (!normalizedOrigin || !normalizedProvider) return '';

  const url = new URL('/api/auth/callback', normalizedOrigin);
  url.searchParams.set('intent', normalizeOAuthIntent(intent));
  url.searchParams.set('next', sanitizeAuthNextPath(nextPath));
  url.searchParams.set('provider', normalizedProvider);
  return url.toString();
}

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

export const AUTH_STATUS = Object.freeze({
  AUTHENTICATED: 'authenticated',
  REFRESHING: 'refreshing',
  ANONYMOUS: 'anonymous',
  LOADING: 'loading',
  ERROR: 'error',
  IDLE: 'idle',
});

export const DEFAULT_AUTH_CONFIG = Object.freeze({
  clearSessionOnUnauthorized: true,
  refreshOnWindowFocus: true,
  hydrateFromStorage: false,
  refreshLeewayMs: 60 * 1000,
  initialSession: null,
  persistSession: false,
  storageKey: 'app_auth_session',
  adapter: null,
  enabled: true,
  debug: false,
});

export const DEFAULT_AUTH_STATE = Object.freeze({
  lastUpdatedAt: null,
  status: AUTH_STATUS.IDLE,
  session: null,
  isAuthenticated: false,
  isReady: false,
  error: null,
  user: null,
});

function getLocalStorage() {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage || null;
  } catch {
    return null;
  }
}

export function createAuthStorage(storageKey = 'app_auth_session') {
  const key = String(storageKey || '').trim() || 'app_auth_session';

  function clear() {
    try {
      getLocalStorage()?.removeItem(key);
    } catch {}
  }

  return {
    clear,

    read() {
      const storage = getLocalStorage();
      if (!storage) return null;

      try {
        const rawValue = storage.getItem(key);
        return rawValue ? JSON.parse(rawValue) : null;
      } catch {
        clear();
        return null;
      }
    },

    write(session) {
      const storage = getLocalStorage();
      if (!storage) return;

      if (!session) {
        clear();
        return;
      }

      try {
        storage.setItem(key, JSON.stringify(session));
      } catch {
        clear();
      }
    },
  };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toIsoDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function normalizeUser(rawUser = {}, fallbackUser = {}) {
  const source = {
    ...(isPlainObject(fallbackUser) ? fallbackUser : {}),
    ...(isPlainObject(rawUser) ? rawUser : {}),
  };

  const roles = uniqueStrings(source.roles || source.role);
  const permissions = uniqueStrings(source.permissions);
  const capabilities = uniqueStrings([...toArray(source.capabilities), ...permissions]);

  return {
    avatarUrl: source.avatarUrl || source.avatar || null,
    capabilities,
    permissions,
    metadata: isPlainObject(source.metadata) ? source.metadata : {},
    roles,
    email: source.email || null,
    name: source.name || source.fullName || source.username || null,
    id: source.id || source.userId || source.sub || null,
  };
}

function normalizeCapabilityState(value = {}, email = null, providerIds = []) {
  const fallbackState = resolveAuthCapabilities({ providerIds, email });
  if (!isPlainObject(value)) return fallbackState;

  return {
    ...fallbackState,
    ...value,
  };
}

export function normalizeSession(input) {
  if (!input) return null;

  if (input.requiresRedirect || input.requiresVerification) {
    return input;
  }

  const directSession = isPlainObject(input.session) ? input.session : null;
  const source = directSession || (isPlainObject(input) ? input : {});
  const user = normalizeUser(input.user, source.user);
  const metadata = isPlainObject(source.metadata) ? source.metadata : {};
  const providerIds = uniqueStrings(metadata.providerIds || []);
  const capabilityState = normalizeCapabilityState(
    source.capabilities || metadata.authCapabilities,
    user.email || source.email || null,
    providerIds,
  );

  const permissions = uniqueStrings([...user.permissions, ...toArray(source.permissions)]);
  const capabilities = uniqueStrings([
    ...user.capabilities,
    ...toArray(source.capabilities),
    ...permissions,
  ]);
  const roles = uniqueStrings([...user.roles, ...toArray(source.roles)]);

  return {
    capabilities: capabilityState,
    expiresAt: toIsoDate(source.expiresAt || source.expiresAtMs || input.expiresAt),
    provider:
      source.provider ||
      input.provider ||
      capabilityState.primaryProvider ||
      resolvePrimaryProvider(providerIds),
    metadata: {
      ...metadata,
      authCapabilities: capabilityState,
    },
    user: {
      ...user,
      capabilities,
      metadata: {
        ...metadata,
        authCapabilities: capabilityState,
      },
      permissions,
      roles,
    },
  };
}

export function mergeUserIntoSession(session, userPatch) {
  const normalizedSession = normalizeSession(session);
  if (!normalizedSession) return null;

  const mergedUser = normalizeUser(userPatch, normalizedSession.user);

  return normalizeSession({
    ...normalizedSession,
    user: {
      ...normalizedSession.user,
      ...mergedUser,
      permissions: uniqueStrings([
        ...normalizedSession.user.permissions,
        ...mergedUser.permissions,
      ]),
      capabilities: uniqueStrings([
        ...normalizedSession.user.capabilities,
        ...mergedUser.capabilities,
      ]),
      roles: uniqueStrings([...normalizedSession.user.roles, ...mergedUser.roles]),
    },
  });
}

export function isSessionExpired(session, leewayMs = 0) {
  const normalizedSession = normalizeSession(session);
  if (!normalizedSession?.expiresAt) return false;

  const expiresAt = new Date(normalizedSession.expiresAt).getTime();
  if (Number.isNaN(expiresAt)) return false;

  return expiresAt <= Date.now() + leewayMs;
}

export function hasRole(session, role) {
  const normalizedSession = normalizeSession(session);
  if (!normalizedSession?.user || !role) return false;

  return normalizedSession.user.roles.includes(String(role));
}

export function hasAnyRole(session, roles = []) {
  const normalizedRoles = toArray(roles);
  if (normalizedRoles.length === 0) return true;

  return normalizedRoles.some((role) => hasRole(session, role));
}

export function hasCapability(session, capability) {
  const normalizedSession = normalizeSession(session);
  if (!normalizedSession?.user || !capability) return false;

  return normalizedSession.user.capabilities.includes(String(capability));
}

export function hasAnyCapability(session, capabilities = []) {
  const normalizedCapabilities = toArray(capabilities);
  if (normalizedCapabilities.length === 0) return true;

  return normalizedCapabilities.some((capability) => hasCapability(session, capability));
}

export function hasAllCapabilities(session, capabilities = []) {
  const normalizedCapabilities = toArray(capabilities);
  if (normalizedCapabilities.length === 0) return true;

  return normalizedCapabilities.every((capability) => hasCapability(session, capability));
}

export function canAccess(
  session,
  { capabilities = [], permissions = [], requireAuth = true, requireAll = true, roles = [] } = {},
) {
  const normalizedSession = normalizeSession(session);
  const requiredCapabilities = [...toArray(capabilities), ...toArray(permissions)];

  if (requireAuth && !normalizedSession) return false;
  if (!normalizedSession) return true;

  const passesRoles = toArray(roles).length === 0 ? true : hasAnyRole(normalizedSession, roles);

  const passesCapabilities =
    requiredCapabilities.length === 0
      ? true
      : requireAll
        ? hasAllCapabilities(normalizedSession, requiredCapabilities)
        : hasAnyCapability(normalizedSession, requiredCapabilities);

  return passesRoles && passesCapabilities;
}

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

export async function fetchCanonicalSessionPayload({ force = false } = {}) {
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
        (await requestJson('/api/auth/session', {
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

function resolveNextPath(payload = {}) {
  return sanitizeAuthNextPath(payload?.nextPath || payload?.next, '/account');
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

async function fetchCanonicalSession({ force = false } = {}) {
  try {
    const payload = await fetchCanonicalSessionPayload({ force });
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
    getOAuthRedirectUrl = null,
    oauthDefaultNextPath = '/account',
    terminateBrowserSession = null,
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
        normalizedError.message = `${providerLabel} linking is disabled. Enable "Manual Linking" in Supabase Auth settings, then try again.`;
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
    const nextSession =
      (await fetchCanonicalSession({ force: true })) || data?.session || data || null;
    await requestAuthJson('/api/auth/security/events', {
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
      return fetchCanonicalSession();
    },

    async refreshSession() {
      clearCanonicalSessionPayloadCache();
      return fetchCanonicalSession({ force: true });
    },

    async signIn(payload = {}) {
      const providerKey = resolveProviderKey(payload);

      if (providerKey === 'passkey') {
        return signInWithPasskey();
      }

      if (providerKey === 'mfa-primary') {
        return fetchAppAuthJson('/api/auth/mfa-primary', {
          fallbackError: 'Authenticator verification failed',
          body: { code: normalizeValue(payload.code) },
        });
      }

      if (isSupportedOAuthProvider(providerKey)) {
        return signInWithOAuthProvider(payload);
      }

      const result = await fetchAppAuthJson('/api/auth/sign-in', {
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

      return fetchCanonicalSession({ force: true });
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
      return fetchCanonicalSession({ force: true });
    },

    async reauthenticate(payload = {}, adapterContext = {}) {
      await fetchAppAuthJson('/api/auth/account', {
        fallbackError: 'Reauthentication failed',
        body: {
          action: 'reauthenticate',
          verification: payload.verification || null,
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
          normalizedError.message = `${getOAuthProviderLabel(provider)} disconnecting is disabled. Enable "Manual Linking" in Supabase Auth settings, then try again.`;
        }

        throw normalizedError;
      }

      clearCanonicalSessionPayloadCache();
      return fetchCanonicalSession({ force: true });
    },

    async signOutOtherSessions() {
      await fetchAppAuthJson('/api/auth/sessions/others', {
        body: {},
        fallbackError: 'Other sessions could not be signed out',
      });
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

const LOCAL_PURGE_SIGN_OUT_REASONS = new Set(['delete-account', 'email-change']);

const IGNORABLE_SIGN_OUT_ERROR_PATTERNS = [
  'authentication token has been revoked',
  'failed to fetch',
  'fetch failed',
  'invalid jwt',
  'invalid number of segments',
  'invalid or expired authentication token',
  'jwt expired',
  'network request failed',
  'request timed out',
  'timeout',
  'timed out',
  'token is malformed',
];

function resolveAuthProvider(payload = {}, session = null) {
  const requestedProvider = String(
    payload?.provider || payload?.strategy || payload?.authProvider || '',
  )
    .trim()
    .toLowerCase();
  if (requestedProvider === 'passkey') return 'passkey';

  const provider = normalizeOAuthProvider(requestedProvider);
  if (provider) return provider;

  const providerIds = Array.isArray(session?.metadata?.providerIds)
    ? session.metadata.providerIds
    : [];
  const sessionProvider = String(session?.provider || '')
    .trim()
    .toLowerCase();
  return (
    normalizeOAuthProvider(sessionProvider) ||
    sessionProvider ||
    resolvePrimaryProvider(providerIds) ||
    'email'
  );
}

function isPendingSignInResult(value) {
  return Boolean(value?.requiresMfa || value?.requiresVerification || value?.requiresRedirect);
}

function isIgnorableSignOutError(error) {
  const message = String(error?.message || '')
    .trim()
    .toLowerCase();
  return (
    Boolean(message) &&
    IGNORABLE_SIGN_OUT_ERROR_PATTERNS.some((pattern) => message.includes(pattern))
  );
}

async function executeAuthMutation({
  adapterMethod,
  applySession,
  emitSessionEvent,
  eventName,
  errorMessage,
  setAuthError,
  setLoadingState,
  transformResponse,
}) {
  setLoadingState();
  try {
    const rawResult = await adapterMethod();
    const resolvedSession = applySession(
      transformResponse ? transformResponse(rawResult) : rawResult,
    );
    if (eventName) {
      emitSessionEvent(eventName, resolvedSession);
    }
    return resolvedSession;
  } catch (error) {
    throw setAuthError(error, errorMessage);
  }
}

export async function runAuthSignIn({
  adapter,
  applySession,
  clearSession,
  credentials,
  emitAuthFeedback,
  emitSessionEvent,
  getAdapterContext,
  previousSession = null,
  setAuthError,
  setLoadingState,
}) {
  const provider = resolveAuthProvider(credentials);

  setLoadingState();
  emitAuthFeedback('login', 'start', {
    description:
      provider === 'passkey'
        ? 'Preparing passkey sign-in'
        : provider !== 'email'
          ? `Redirecting to ${getOAuthProviderLabel(provider)} sign-in`
          : 'Checking credentials and preparing session',
    title: 'Signing In',
  });

  try {
    const signInResult = await adapter.signIn(credentials, getAdapterContext());

    if (isPendingSignInResult(signInResult)) {
      if (signInResult?.requiresMfa || signInResult?.requiresVerification) {
        emitAuthFeedback('login', 'clear');
      }

      if (signInResult?.requiresRedirect && typeof window !== 'undefined') {
        window.setTimeout(() => {
          emitAuthFeedback('login', 'clear');
        }, 12000);
      }

      if (previousSession) {
        applySession(previousSession);
      } else {
        clearSession();
      }
      return signInResult;
    }

    const session = applySession(signInResult);

    if (!session?.user) {
      emitAuthFeedback('login', 'clear');
      return session;
    }

    emitSessionEvent(EVENT_TYPES.AUTH_SIGN_IN, session);

    return session;
  } catch (error) {
    emitAuthFeedback('login', 'failure');
    throw setAuthError(error, 'Sign in failed');
  }
}

export async function runAuthRefreshSession({
  adapter,
  applySession,
  clearSession,
  emitSessionEvent,
  getAdapterContext,
  isReady = false,
  session,
  setAuthError,
  setLoadingState,
  silent = false,
}) {
  const activeSession = normalizeSession(session);

  if (!adapter?.refreshSession && !adapter?.getSession) {
    return activeSession;
  }

  setLoadingState(isReady ? AUTH_STATUS.REFRESHING : AUTH_STATUS.LOADING, {
    preserveError: silent,
  });

  try {
    const nextSession = activeSession
      ? await adapter.refreshSession(activeSession, getAdapterContext(activeSession))
      : await adapter.getSession(getAdapterContext(null));
    const resolvedSession = applySession(nextSession);

    emitSessionEvent(EVENT_TYPES.AUTH_REFRESH, resolvedSession);
    return resolvedSession;
  } catch (error) {
    clearSession({ preserveError: silent });

    if (!silent) {
      throw setAuthError(error, 'Session refresh failed');
    }

    return null;
  }
}

export async function runAuthInitialize({
  adapter,
  applySession,
  clearSession,
  emitAuthEvent,
  enabled = true,
  getAdapterContext,
  hydrateFromStorage = true,
  initialSession = null,
  refreshLeewayMs = 0,
  refreshSession,
  setAuthError,
  setLoadingState,
  storage,
}) {
  if (!enabled) {
    applySession(null, AUTH_STATUS.ANONYMOUS);
    emitAuthEvent(EVENT_TYPES.AUTH_READY, { session: null, user: null });
    return;
  }

  setLoadingState();

  let session = normalizeSession(
    initialSession || (hydrateFromStorage && !initialSession ? storage.read() : null),
  );

  try {
    if (session && isSessionExpired(session, refreshLeewayMs)) {
      session = await refreshSession({
        session,
        silent: true,
      });
    }

    if (!session && adapter?.getSession) {
      session = normalizeSession(await adapter.getSession(getAdapterContext(null)));
    }

    if (session) {
      session = applySession(session);
    } else {
      clearSession();
    }

    emitAuthEvent(EVENT_TYPES.AUTH_READY, {
      session: session || null,
      user: session?.user || null,
    });
  } catch (error) {
    clearSession();
    setAuthError(error, 'Authentication bootstrap failed');
  }
}

export async function runAuthSignUp({
  adapter,
  applySession,
  emitSessionEvent,
  getAdapterContext,
  payload,
  setAuthError,
  setLoadingState,
}) {
  setLoadingState();

  try {
    const signUpResult = await adapter.signUp(payload, getAdapterContext());

    if (isPendingSignInResult(signUpResult)) {
      return signUpResult;
    }

    const session = applySession(signUpResult);
    emitSessionEvent(EVENT_TYPES.AUTH_SIGN_UP, session);
    return session;
  } catch (error) {
    throw setAuthError(error, 'Sign up failed');
  }
}

export async function runAuthSignOut({
  adapter,
  clearSession,
  emitAuthEvent,
  emitAuthFeedback,
  getAdapterContext,
  previousSession,
  reason = 'logout',
  setAuthError,
  setLoadingState,
}) {
  let signOutError = null;
  const shouldUseLocalPurge = LOCAL_PURGE_SIGN_OUT_REASONS.has(reason);

  setLoadingState();
  emitAuthFeedback('logout', 'start', {
    description: 'Ending active session',
    title: 'Signing Out',
  });

  try {
    if (adapter?.signOut) {
      await adapter.signOut(getAdapterContext(previousSession), {
        mode: shouldUseLocalPurge ? 'local-purge' : 'global',
      });
    }
  } catch (error) {
    if (!isIgnorableSignOutError(error)) {
      emitAuthFeedback('logout', 'failure');
      signOutError = setAuthError(error, 'Sign out failed');
    }
  }

  clearSession({ preserveError: Boolean(signOutError) });

  emitAuthEvent(EVENT_TYPES.AUTH_SIGN_OUT, {
    reason,
    previousSession,
    session: null,
    user: null,
  });

  if (!previousSession?.user && reason !== 'delete-account') {
    emitAuthFeedback('logout', 'clear');
  }

  if (signOutError) {
    throw signOutError;
  }

  return true;
}

export async function runAuthUpdateProfile(params) {
  const session = await executeAuthMutation({
    adapterMethod: () => params.adapter.updateProfile(params.payload, params.getAdapterContext()),
    applySession: params.applySession,
    emitSessionEvent: params.emitSessionEvent,
    eventName: EVENT_TYPES.AUTH_UPDATE,
    errorMessage: 'Profile update failed',
    setAuthError: params.setAuthError,
    setLoadingState: params.setLoadingState,
    transformResponse: (response) =>
      normalizeSession(response) || mergeUserIntoSession(params.currentSession, response),
  });

  return session?.user || null;
}

export async function runAuthReauthenticate(params) {
  return executeAuthMutation({
    adapterMethod: () => params.adapter.reauthenticate(params.payload, params.getAdapterContext()),
    applySession: params.applySession,
    emitSessionEvent: (evt, sess) =>
      params.emitSessionEvent(evt, sess, { action: 'reauthenticate' }),
    eventName: EVENT_TYPES.AUTH_UPDATE,
    errorMessage: 'Reauthentication failed',
    setAuthError: params.setAuthError,
    setLoadingState: params.setLoadingState,
  });
}

export async function runAuthProviderMutation({
  adapter,
  applySession,
  emitSessionEvent,
  failureMessage,
  getAdapterContext,
  methodName,
  payload,
  setAuthError,
  setLoadingState,
  successEventName,
}) {
  setLoadingState();

  try {
    const rawResult = await adapter[methodName](payload, getAdapterContext());

    if (isPendingSignInResult(rawResult)) {
      return rawResult;
    }

    const session = applySession(rawResult);

    emitSessionEvent(successEventName, session);

    return session;
  } catch (error) {
    throw setAuthError(error, failureMessage);
  }
}

const FALLBACK_AUTH_ACTIONS = Object.freeze({
  clearError: () => {},
  initialize: async () => null,
  linkProvider: async () => null,
  reauthenticate: async () => null,
  refreshSession: async () => null,
  registerPasskey: async () => null,
  listPasskeys: async () => [],
  updatePasskey: async () => null,
  deletePasskey: async () => null,
  listMfaFactors: async () => [],
  enrollMfa: async () => null,
  challengeMfa: async () => null,
  verifyMfa: async () => null,
  unenrollMfa: async () => null,
  getMfaAssuranceLevel: async () => null,
  signIn: async () => null,
  signOutOtherSessions: async () => null,
  signOut: async () => null,
  signUp: async () => null,
  unlinkProvider: async () => null,
  updateProfile: async () => null,
});

const AUTH_FLOW_STATUS = Object.freeze({
  login: Object.freeze({ priority: 110, statusType: 'LOGIN', themeType: 'LOGIN' }),
  logout: Object.freeze({ priority: 110, statusType: 'LOGOUT', themeType: 'LOGOUT' }),
});

function toAuthError(error, fallbackMessage) {
  if (error instanceof Error) return error;
  const normalizedError = new Error(
    error?.message || fallbackMessage || 'Authentication request failed',
  );
  normalizedError.name = error?.name || 'AuthError';
  normalizedError.status = error?.status || 0;
  normalizedError.data = error?.data || null;
  return normalizedError;
}

function createAdapterContext(config, storage, session) {
  return { config, storage, session: normalizeSession(session) };
}

function createSessionState(prevState, nextSession, nextStatus = null) {
  const session = normalizeSession(nextSession);
  return {
    ...prevState,
    lastUpdatedAt: Date.now(),
    status: nextStatus || (session ? AUTH_STATUS.AUTHENTICATED : AUTH_STATUS.ANONYMOUS),
    session,
    user: session?.user || null,
    isReady: true,
    error: null,
  };
}

function createAnonymousState(prevState, { preserveError = false } = {}) {
  return {
    ...prevState,
    lastUpdatedAt: Date.now(),
    status: AUTH_STATUS.ANONYMOUS,
    session: null,
    user: null,
    isReady: true,
    error: preserveError ? prevState.error : null,
  };
}

function createAuthErrorState(prevState, error) {
  return {
    ...prevState,
    lastUpdatedAt: Date.now(),
    status: AUTH_STATUS.ERROR,
    isReady: true,
    error,
  };
}

function createAuthLoadingState(
  prevState,
  status = AUTH_STATUS.LOADING,
  { preserveError = false } = {},
) {
  return { ...prevState, status, error: preserveError ? prevState.error : null };
}

function normalizeAuthFlowValue(value) {
  return normalizeLowerValue(value);
}

function createAuthEventPayload(payload = {}) {
  return { timestamp: Date.now(), ...payload };
}

function createSessionEventPayload(session, payload = {}) {
  return { session: session || null, user: session?.user || null, ...payload };
}

const AuthConfigContext = createContext(DEFAULT_AUTH_CONFIG);
const AuthStateContext = createContext(DEFAULT_AUTH_STATE);
const AuthActionsContext = createContext(FALLBACK_AUTH_ACTIONS);

export function AuthProvider({ children, config = {} }) {
  const mergedConfig = useMemo(() => ({ ...DEFAULT_AUTH_CONFIG, ...config }), [config]);

  const storage = useMemo(
    () => createAuthStorage(mergedConfig.storageKey),
    [mergedConfig.storageKey],
  );

  const adapterRef = useRef(mergedConfig.adapter);
  const bootstrapRef = useRef(false);
  const sessionRef = useRef(null);

  const [state, setState] = useState(() => {
    if (mergedConfig.initialSession) {
      const normalizedSession = normalizeSession(mergedConfig.initialSession);
      if (normalizedSession) {
        return createSessionState(DEFAULT_AUTH_STATE, normalizedSession);
      }
    }

    return DEFAULT_AUTH_STATE;
  });

  adapterRef.current = mergedConfig.adapter;
  sessionRef.current = state.session;

  const emitAuthEvent = useCallback((eventType, payload = {}) => {
    globalEvents.emit(eventType, createAuthEventPayload(payload));
  }, []);

  const emitAuthFeedback = useCallback(
    (flow, phase, overrides = {}) => {
      const normalizedFlow = normalizeAuthFlowValue(flow);
      const normalizedPhase = normalizeAuthFlowValue(phase);

      if (!normalizedFlow || !normalizedPhase) return;

      const flowConfig = AUTH_FLOW_STATUS[normalizedFlow] || null;

      emitAuthEvent(EVENT_TYPES.AUTH_FEEDBACK, {
        flow: normalizedFlow,
        phase: normalizedPhase,
        statusType:
          overrides.statusType || flowConfig?.statusType || normalizedFlow.trim().toUpperCase(),
        themeType: overrides.themeType || flowConfig?.themeType || 'LOGIN',
        priority: overrides.priority ?? flowConfig?.priority ?? 110,
        ...(overrides.title != null ? { title: overrides.title } : {}),
        ...(overrides.description != null ? { description: overrides.description } : {}),
        ...(overrides.icon != null ? { icon: overrides.icon } : {}),
        ...(overrides.duration != null ? { duration: overrides.duration } : {}),
        ...(overrides.isOverlay != null ? { isOverlay: overrides.isOverlay } : {}),
      });
    },
    [emitAuthEvent],
  );

  const applySession = useCallback((nextSession, nextStatus = null) => {
    const normalizedSession = normalizeSession(nextSession);
    setState((prevState) => createSessionState(prevState, normalizedSession, nextStatus));
    return normalizedSession;
  }, []);

  const clearSession = useCallback(({ preserveError = false } = {}) => {
    setState((prevState) => createAnonymousState(prevState, { preserveError }));
  }, []);

  const setAuthError = useCallback(
    (error, fallbackMessage) => {
      const normalizedError = toAuthError(error, fallbackMessage);
      setState((prevState) => createAuthErrorState(prevState, normalizedError));
      emitAuthEvent(EVENT_TYPES.AUTH_ERROR, {
        error: normalizedError,
        message: normalizedError.message,
      });
      return normalizedError;
    },
    [emitAuthEvent],
  );

  const setLoadingState = useCallback(
    (status = AUTH_STATUS.LOADING, { preserveError = false } = {}) => {
      setState((prevState) => createAuthLoadingState(prevState, status, { preserveError }));
    },
    [],
  );

  const getAdapterContext = useCallback(
    (session = sessionRef.current) => createAdapterContext(mergedConfig, storage, session),
    [mergedConfig, storage],
  );

  const getAdapterMethod = useCallback(
    (methodName, unavailableMessage, fallbackMessage) => {
      const adapter = adapterRef.current;
      if (typeof adapter?.[methodName] !== 'function') {
        throw setAuthError(new Error(unavailableMessage), fallbackMessage);
      }
      return adapter;
    },
    [setAuthError],
  );

  const emitSessionEvent = useCallback(
    (eventType, session, payload = {}) => {
      emitAuthEvent(eventType, createSessionEventPayload(session, payload));
    },
    [emitAuthEvent],
  );

  const refreshSession = useCallback(
    (payload) =>
      runAuthRefreshSession({
        adapter: adapterRef.current,
        applySession,
        clearSession,
        emitSessionEvent,
        getAdapterContext,
        isReady: state.isReady,
        session: payload?.session || sessionRef.current,
        setAuthError,
        setLoadingState,
        silent: payload?.silent,
      }),
    [
      applySession,
      clearSession,
      emitSessionEvent,
      getAdapterContext,
      setAuthError,
      setLoadingState,
      state.isReady,
    ],
  );

  const initialize = useCallback(async () => {
    if (bootstrapRef.current) return;
    bootstrapRef.current = true;

    await runAuthInitialize({
      adapter: adapterRef.current,
      applySession,
      clearSession,
      emitAuthEvent,
      enabled: mergedConfig.enabled,
      getAdapterContext,
      hydrateFromStorage: mergedConfig.hydrateFromStorage,
      initialSession: mergedConfig.initialSession,
      refreshLeewayMs: mergedConfig.refreshLeewayMs,
      refreshSession,
      setAuthError,
      setLoadingState,
      storage,
    });
  }, [
    applySession,
    clearSession,
    emitAuthEvent,
    getAdapterContext,
    mergedConfig.enabled,
    mergedConfig.hydrateFromStorage,
    mergedConfig.initialSession,
    mergedConfig.refreshLeewayMs,
    refreshSession,
    setAuthError,
    setLoadingState,
    storage,
  ]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!mergedConfig.persistSession) {
      storage.clear();
      return;
    }

    if (state.session) {
      storage.write(state.session);
    } else {
      storage.clear();
    }
  }, [mergedConfig.persistSession, state.session, storage]);

  useEffect(() => {
    if (!mergedConfig.clearSessionOnUnauthorized) return;

    return globalEvents.subscribe(EVENT_TYPES.API_UNAUTHORIZED, (eventData) => {
      if (eventData?.source && eventData.source !== 'app') return;

      clearSession();
      emitAuthEvent(EVENT_TYPES.AUTH_SIGN_OUT, {
        source: 'api-unauthorized',
        session: null,
        user: null,
      });
    });
  }, [clearSession, emitAuthEvent, mergedConfig.clearSessionOnUnauthorized]);

  useEffect(() => {
    if (!mergedConfig.refreshOnWindowFocus || !mergedConfig.enabled) return;

    function handleFocus() {
      const activeSession = sessionRef.current;
      if (activeSession && isSessionExpired(activeSession, mergedConfig.refreshLeewayMs)) {
        refreshSession({ session: activeSession, silent: true });
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        handleFocus();
      }
    }

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    mergedConfig.enabled,
    mergedConfig.refreshLeewayMs,
    mergedConfig.refreshOnWindowFocus,
    refreshSession,
  ]);

  useEffect(() => {
    const adapter = adapterRef.current;
    if (!adapter?.onAuthStateChange) return;

    return adapter.onAuthStateChange((nextSession) => {
      const normalizedSession = normalizeSession(nextSession);

      if (normalizedSession) {
        applySession(normalizedSession);
        emitSessionEvent(EVENT_TYPES.AUTH_UPDATE, normalizedSession, {
          source: 'adapter-subscription',
        });
        return;
      }

      clearSession();
      emitAuthEvent(EVENT_TYPES.AUTH_SIGN_OUT, {
        source: 'adapter-subscription',
        session: null,
        user: null,
      });
    }, getAdapterContext(sessionRef.current));
  }, [applySession, clearSession, emitAuthEvent, emitSessionEvent, getAdapterContext]);

  const signIn = useCallback(
    (credentials) =>
      runAuthSignIn({
        adapter: getAdapterMethod(
          'signIn',
          'Active auth adapter does not implement signIn',
          'Authentication adapter is not configured',
        ),
        applySession,
        clearSession,
        credentials,
        emitAuthFeedback,
        emitSessionEvent,
        getAdapterContext,
        previousSession: sessionRef.current,
        setAuthError,
        setLoadingState,
      }),
    [
      applySession,
      clearSession,
      emitAuthFeedback,
      emitSessionEvent,
      getAdapterContext,
      getAdapterMethod,
      setAuthError,
      setLoadingState,
    ],
  );

  const signUp = useCallback(
    (payload) =>
      runAuthSignUp({
        adapter: getAdapterMethod(
          'signUp',
          'Active auth adapter does not implement signUp',
          'Authentication adapter is not configured',
        ),
        applySession,
        emitSessionEvent,
        getAdapterContext,
        payload,
        setAuthError,
        setLoadingState,
      }),
    [
      applySession,
      emitSessionEvent,
      getAdapterContext,
      getAdapterMethod,
      setAuthError,
      setLoadingState,
    ],
  );

  const signOut = useCallback(
    (payload) =>
      runAuthSignOut({
        adapter: adapterRef.current,
        clearSession,
        emitAuthEvent,
        emitAuthFeedback,
        getAdapterContext,
        previousSession: sessionRef.current,
        ...(payload || {}),
        setAuthError,
        setLoadingState,
      }),
    [
      clearSession,
      emitAuthEvent,
      emitAuthFeedback,
      getAdapterContext,
      setAuthError,
      setLoadingState,
    ],
  );

  const updateProfile = useCallback(
    (payload) =>
      runAuthUpdateProfile({
        adapter: getAdapterMethod(
          'updateProfile',
          'Active auth adapter does not implement updateProfile',
          'Profile updates are not supported by the current auth adapter',
        ),
        applySession,
        currentSession: sessionRef.current,
        emitSessionEvent,
        getAdapterContext,
        payload,
        setAuthError,
        setLoadingState,
      }),
    [
      applySession,
      emitSessionEvent,
      getAdapterContext,
      getAdapterMethod,
      setAuthError,
      setLoadingState,
    ],
  );

  const reauthenticate = useCallback(
    (payload) =>
      runAuthReauthenticate({
        adapter: getAdapterMethod(
          'reauthenticate',
          'Active auth adapter does not implement reauthenticate',
          'Reauthentication is not supported by the current auth adapter',
        ),
        applySession,
        emitSessionEvent,
        getAdapterContext,
        payload,
        setAuthError,
        setLoadingState,
      }),
    [
      applySession,
      emitSessionEvent,
      getAdapterContext,
      getAdapterMethod,
      setAuthError,
      setLoadingState,
    ],
  );

  const runProviderMutation = useCallback(
    (
      payload,
      {
        methodName,
        successEventName,
        successAuditType,
        failureMessage,
        failureAction,
        unsupportedMessage,
      },
    ) =>
      runAuthProviderMutation({
        adapter: getAdapterMethod(
          methodName,
          `Active auth adapter does not implement ${methodName}`,
          unsupportedMessage,
        ),
        applySession,
        emitSessionEvent,
        failureMessage,
        getAdapterContext,
        methodName,
        payload,
        setAuthError,
        setLoadingState,
        successEventName,
      }),
    [
      applySession,
      emitSessionEvent,
      getAdapterContext,
      getAdapterMethod,
      setAuthError,
      setLoadingState,
    ],
  );

  const runPasskeyAction = useCallback(
    async (methodName, payload, fallbackMessage) => {
      const adapter = getAdapterMethod(
        methodName,
        `Active auth adapter does not implement ${methodName}`,
        'Passkey authentication is not supported by the current auth adapter',
      );

      try {
        return await adapter[methodName](payload, getAdapterContext(sessionRef.current));
      } catch (error) {
        throw setAuthError(error, fallbackMessage);
      }
    },
    [getAdapterContext, getAdapterMethod, setAuthError],
  );

  const registerPasskey = useCallback(
    (payload) => runPasskeyAction('registerPasskey', payload, 'Passkey registration failed'),
    [runPasskeyAction],
  );

  const listPasskeys = useCallback(
    (payload) => runPasskeyAction('listPasskeys', payload, 'Passkeys could not be loaded'),
    [runPasskeyAction],
  );

  const updatePasskey = useCallback(
    (payload) => runPasskeyAction('updatePasskey', payload, 'Passkey could not be renamed'),
    [runPasskeyAction],
  );

  const deletePasskey = useCallback(
    (payload) => runPasskeyAction('deletePasskey', payload, 'Passkey could not be removed'),
    [runPasskeyAction],
  );

  const runMfaAction = useCallback(
    async (methodName, payload, fallbackMessage) => {
      const adapter = getAdapterMethod(
        methodName,
        `Active auth adapter does not implement ${methodName}`,
        'MFA is not supported by the current auth adapter',
      );
      try {
        return await adapter[methodName](payload, getAdapterContext(sessionRef.current));
      } catch (error) {
        throw setAuthError(error, fallbackMessage);
      }
    },
    [getAdapterContext, getAdapterMethod, setAuthError],
  );

  const listMfaFactors = useCallback(
    (payload) => runMfaAction('listMfaFactors', payload, 'MFA factors could not be loaded'),
    [runMfaAction],
  );
  const enrollMfa = useCallback(
    (payload) => runMfaAction('enrollMfa', payload, 'MFA enrollment could not be started'),
    [runMfaAction],
  );
  const challengeMfa = useCallback(
    (payload) => runMfaAction('challengeMfa', payload, 'MFA challenge could not be created'),
    [runMfaAction],
  );
  const verifyMfa = useCallback(
    (payload) => runMfaAction('verifyMfa', payload, 'MFA code could not be verified'),
    [runMfaAction],
  );
  const unenrollMfa = useCallback(
    (payload) => runMfaAction('unenrollMfa', payload, 'MFA factor could not be removed'),
    [runMfaAction],
  );
  const getMfaAssuranceLevel = useCallback(
    (payload) =>
      runMfaAction('getMfaAssuranceLevel', payload, 'MFA assurance level could not be loaded'),
    [runMfaAction],
  );

  const linkProvider = useCallback(
    (payload) =>
      runProviderMutation(payload, {
        methodName: 'linkProvider',
        successEventName: EVENT_TYPES.AUTH_UPDATE,
        failureMessage: 'Provider linking failed',
        unsupportedMessage: 'Provider linking is not supported by the current auth adapter',
      }),
    [runProviderMutation],
  );

  const unlinkProvider = useCallback(
    (payload) =>
      runProviderMutation(payload, {
        methodName: 'unlinkProvider',
        successEventName: EVENT_TYPES.AUTH_UPDATE,
        failureMessage: 'Provider unlinking failed',
        unsupportedMessage: 'Provider unlinking is not supported by the current auth adapter',
      }),
    [runProviderMutation],
  );

  const signOutOtherSessions = useCallback(
    (payload) =>
      runProviderMutation(payload, {
        methodName: 'signOutOtherSessions',
        successEventName: EVENT_TYPES.AUTH_UPDATE,
        failureMessage: 'Other sessions could not be signed out',
        unsupportedMessage: 'Session management is not supported by the current auth adapter',
      }),
    [runProviderMutation],
  );

  const clearError = useCallback(() => {
    setState((prevState) => ({
      ...prevState,
      error: null,
      status: prevState.session ? AUTH_STATUS.AUTHENTICATED : AUTH_STATUS.ANONYMOUS,
    }));
  }, []);

  const stateValue = useMemo(
    () => ({
      ...state,
      capabilities: state.session?.capabilities || null,
      config: mergedConfig,
      isAuthenticated: Boolean(state.session),
      isAnonymous: state.status === AUTH_STATUS.ANONYMOUS || (!state.session && state.isReady),
    }),
    [mergedConfig, state],
  );

  const actionsValue = useMemo(
    () => ({
      updateProfile,
      refreshSession,
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
      reauthenticate,
      unlinkProvider,
      initialize,
      linkProvider,
      clearError,
      signIn,
      signOutOtherSessions,
      signUp,
      signOut,
    }),
    [
      updateProfile,
      refreshSession,
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
      reauthenticate,
      unlinkProvider,
      initialize,
      linkProvider,
      clearError,
      signIn,
      signOutOtherSessions,
      signUp,
      signOut,
    ],
  );

  return (
    <AuthConfigContext.Provider value={mergedConfig}>
      <AuthActionsContext.Provider value={actionsValue}>
        <AuthStateContext.Provider value={stateValue}>{children}</AuthStateContext.Provider>
      </AuthActionsContext.Provider>
    </AuthConfigContext.Provider>
  );
}

export function useAuthConfig() {
  return useContext(AuthConfigContext);
}

export function useAuthState() {
  return useContext(AuthStateContext);
}

export function useAuthActions() {
  return useContext(AuthActionsContext);
}

export function useAuth() {
  const state = useAuthState();
  const actions = useAuthActions();

  return useMemo(
    () => ({
      ...state,
      ...actions,
      can: (rules) => canAccess(state.session, rules),
      hasRole: (role) => hasRole(state.session, role),
      hasCapability: (capability) => hasCapability(state.session, capability),
    }),
    [actions, state],
  );
}

export function useAuthSessionReady(expectedUserId = null) {
  const authState = useAuthState();

  return useMemo(() => {
    if (!authState?.isReady) return false;
    if (!expectedUserId) return true;

    const userId = authState?.user?.id ?? null;
    return Boolean(userId) && String(userId) === String(expectedUserId);
  }, [authState, expectedUserId]);
}

export function useAuthorization(rules = {}) {
  const auth = useAuth();

  const isPending =
    !auth.isReady ||
    auth.status === AUTH_STATUS.IDLE ||
    auth.status === AUTH_STATUS.LOADING ||
    auth.status === AUTH_STATUS.REFRESHING;

  const isAllowed = canAccess(auth.session, rules);

  return useMemo(
    () => ({
      isAuthenticated: auth.isAuthenticated,
      isAnonymous: auth.isAnonymous,
      isAllowed,
      isPending,
      can: auth.can,
      auth,
    }),
    [isAllowed, isPending, auth],
  );
}

export function AuthGate({ loadingFallback = null, fallback = null, children, ...rules }) {
  const { isAllowed, isPending } = useAuthorization(rules);

  if (isPending) return loadingFallback;
  if (!isAllowed) return fallback;

  return <>{children}</>;
}

export function AnonymousGate({ loadingFallback = null, fallback = null, children }) {
  const auth = useAuth();

  if (!auth.isReady || auth.status === AUTH_STATUS.LOADING) {
    return loadingFallback;
  }

  if (auth.isAuthenticated) {
    return fallback;
  }

  return <>{children}</>;
}
