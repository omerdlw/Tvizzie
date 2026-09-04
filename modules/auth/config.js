import { normalizeLowerValue, normalizeValue } from '@/shared';

// Provider identities and OAuth appearance metadata are the single source of truth for the auth module.
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

const AUTH_REDIRECT_BASE_ORIGIN = 'http://localhost';
const AUTH_BLOCKED_NEXT_PATHS = new Set([
  '/auth/callback',
  '/auth/oauth-callback',
  '/callback',
  '/sign-in',
  '/sign-up',
]);
const OAUTH_INTENTS = new Set(['link', 'sign-in', 'sign-up']);

export const OAUTH_PROVIDER_KEYS = Object.freeze(Object.keys(OAUTH_PROVIDER_CONFIG));

export const DEFAULT_AUTH_ENDPOINTS = Object.freeze({
  account: '/api/auth/account',
  mfaPrimary: '/api/auth/mfa-primary',
  securityEvents: '/api/auth/security/events',
  session: '/api/auth/session',
  signIn: '/api/auth/sign-in',
  sessions: '/api/auth/sessions',
  signOutOtherSessions: '/api/auth/sessions/others',
});

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

// Redirect targets may only consist of safe paths within the same origin.
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
  callbackPath = '/auth/callback',
  intent = 'sign-in',
  nextPath = '/account',
  origin,
  provider,
} = {}) {
  let normalizedOrigin = '';
  try {
    normalizedOrigin = origin ? new URL(origin).origin : '';
  } catch {
    return '';
  }

  const normalizedProvider = normalizeOAuthProvider(provider);
  if (!normalizedOrigin || !normalizedProvider) return '';

  const url = new URL(callbackPath, normalizedOrigin);
  url.searchParams.set('intent', normalizeOAuthIntent(intent));
  url.searchParams.set('next', sanitizeAuthNextPath(nextPath));
  url.searchParams.set('provider', normalizedProvider);
  return url.toString();
}

// Auth state contract is the shared foundation of storage and session model.
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
  endpoints: DEFAULT_AUTH_ENDPOINTS,
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
