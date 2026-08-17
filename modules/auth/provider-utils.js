import { normalizeEmailValue, normalizeLowerValue, normalizeValue } from '@/domains/shell/shared/utils';

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

export function getOAuthProviderId(value) {
  return getOAuthProviderConfig(value)?.id || null;
}

export function getOAuthProviderLabel(value, fallback = 'OAuth') {
  return getOAuthProviderConfig(value)?.label || fallback;
}

export function normalizeProviderId(value) {
  const normalizedValue = normalizeLowerValue(value);
  if (!normalizedValue || DISABLED_PROVIDER_ALIASES.includes(normalizedValue)) return null;
  if (normalizedValue === 'email' || normalizedValue === PASSWORD_PROVIDER_ID) {
    return PASSWORD_PROVIDER_ID;
  }

  return getOAuthProviderId(normalizedValue) || normalizedValue;
}

export function getEnabledOAuthProviderIds(providerIds = []) {
  return toArray(providerIds)
    .map(normalizeProviderId)
    .filter((providerId) => providerId && providerId !== PASSWORD_PROVIDER_ID);
}

export function resolvePrimaryProvider(providerIds = []) {
  const normalizedProviderIds = uniqueStrings(
    toArray(providerIds).map(normalizeProviderId).filter(Boolean),
  );

  if (normalizedProviderIds.includes(PASSWORD_PROVIDER_ID)) return PASSWORD_PROVIDER_ID;
  if (normalizedProviderIds.includes(GOOGLE_PROVIDER_ID)) return 'google';
  if (normalizedProviderIds.includes(GITHUB_PROVIDER_ID)) return 'github';

  return normalizeOAuthProvider(normalizedProviderIds[0]) || normalizedProviderIds[0] || null;
}

export function resolveAuthCapabilities({ providerIds = [], email = null } = {}) {
  const resolvedProviderIds = uniqueStrings(
    toArray(providerIds).map(normalizeProviderId).filter(Boolean),
  );
  const passwordEnabled = resolvedProviderIds.includes(PASSWORD_PROVIDER_ID);
  const oauthProviderIds = getEnabledOAuthProviderIds(resolvedProviderIds);
  const oauthEnabled = oauthProviderIds.length > 0;

  return {
    passwordEnabled,
    oauthEnabled,
    oauthProviderIds,
    googleEnabled: resolvedProviderIds.includes(GOOGLE_PROVIDER_ID),
    githubEnabled: resolvedProviderIds.includes(GITHUB_PROVIDER_ID),
    primaryProvider: resolvePrimaryProvider(resolvedProviderIds),
    needsPasswordSetup: oauthEnabled && !passwordEnabled,
    canResetPassword: passwordEnabled && Boolean(normalizeEmailValue(email)),
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
