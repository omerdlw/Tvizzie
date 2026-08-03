import { normalizeLowerValue, normalizeValue } from '@/shared/utils';

// ============================================================
// OAuth Provider Configurations & Enums
// ============================================================

export const GITHUB_PROVIDER_ID = 'github';
export const GOOGLE_PROVIDER_ID = 'google.com';
export const PASSWORD_PROVIDER_ID = 'password';
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
});

const OAUTH_PROVIDER_ALIASES = Object.freeze({
  github: 'github',
  'github.com': 'github',
  google: 'google',
  'google.com': 'google',
});

export const OAUTH_PROVIDER_KEYS = Object.freeze(Object.keys(OAUTH_PROVIDER_CONFIG));

export function normalizeOAuthProvider(value) {
  const normalizedValue = normalizeLowerValue(value);
  if (!normalizedValue) return null;
  return OAUTH_PROVIDER_ALIASES[normalizedValue] || null;
}

export function isSupportedOAuthProvider(value) {
  return Boolean(normalizeOAuthProvider(value));
}

export function getOAuthProviderConfig(value) {
  const providerKey = normalizeOAuthProvider(value);
  if (!providerKey) return null;
  return OAUTH_PROVIDER_CONFIG[providerKey] || null;
}

export function getOAuthProviderId(value) {
  return getOAuthProviderConfig(value)?.id || null;
}

export function getOAuthProviderLabel(value, fallback = 'OAuth') {
  return getOAuthProviderConfig(value)?.label || fallback;
}

export function getOAuthProviderIcon(value) {
  return getOAuthProviderConfig(value)?.icon || null;
}

export function normalizeProviderId(value) {
  const normalizedValue = normalizeValue(value);
  if (!normalizedValue) return null;

  if (normalizedValue === 'email' || normalizedValue === PASSWORD_PROVIDER_ID) {
    return PASSWORD_PROVIDER_ID;
  }
  if (DISABLED_PROVIDER_ALIASES.includes(normalizedValue)) {
    return null;
  }

  const oauthProviderId = getOAuthProviderId(normalizedValue);
  return oauthProviderId || normalizedValue;
}

export function getEnabledOAuthProviderIds(providerIds = []) {
  return providerIds
    .map((providerId) => normalizeProviderId(providerId))
    .filter((providerId) => providerId && providerId !== PASSWORD_PROVIDER_ID);
}

// ============================================================
// OAuth Callback & Intent Handling
// ============================================================

const REDIRECT_BASE_ORIGIN = 'https://tvizzie.local';
const LEGACY_AUTH_CALLBACK_PATH = '/auth/callback';
const LEGACY_AUTH_OAUTH_CALLBACK_PATH = '/auth/oauth-callback';

export const AUTH_OAUTH_CALLBACK_PATH = '/callback';
export const AUTH_DEFAULT_POST_LOGIN_PATH = '/account';

const BLOCKED_NEXT_PATHS = new Set([
  '/sign-in',
  '/sign-up',
  AUTH_OAUTH_CALLBACK_PATH,
  LEGACY_AUTH_CALLBACK_PATH,
  LEGACY_AUTH_OAUTH_CALLBACK_PATH,
]);

const OAUTH_INTENTS = new Set(['link', 'sign-in', 'sign-up']);

export function sanitizeAuthNextPath(nextPath, fallback = AUTH_DEFAULT_POST_LOGIN_PATH) {
  const rawValue = normalizeValue(nextPath);
  if (!rawValue) return fallback;

  if (
    !rawValue.startsWith('/') ||
    rawValue.startsWith('http://') ||
    rawValue.startsWith('https://')
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(rawValue, REDIRECT_BASE_ORIGIN);
    const normalizedPath = `${parsed.pathname}${parsed.search}${parsed.hash}`;

    if (parsed.origin !== REDIRECT_BASE_ORIGIN || BLOCKED_NEXT_PATHS.has(parsed.pathname)) {
      return fallback;
    }

    return normalizedPath;
  } catch {
    return fallback;
  }
}

export function normalizeOAuthIntent(value, fallback = 'sign-in') {
  const normalizedIntent = normalizeValue(value).toLowerCase();
  return OAUTH_INTENTS.has(normalizedIntent) ? normalizedIntent : fallback;
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
  nextPath = AUTH_DEFAULT_POST_LOGIN_PATH,
  origin,
  provider,
} = {}) {
  const normalizedOrigin = origin ? new URL(origin).origin : '';
  const normalizedProvider = normalizeOAuthProvider(provider);

  if (!normalizedOrigin || !normalizedProvider) return '';

  const url = new URL(AUTH_OAUTH_CALLBACK_PATH, normalizedOrigin);
  const normalizedIntent = normalizeOAuthIntent(intent);

  url.searchParams.set('next', sanitizeAuthNextPath(nextPath, AUTH_DEFAULT_POST_LOGIN_PATH));
  url.searchParams.set('intent', normalizedIntent);
  url.searchParams.set('provider', normalizedProvider);

  return url.toString();
}
