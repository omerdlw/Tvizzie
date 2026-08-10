import { normalizeEmailValue, normalizeLowerValue, normalizeValue } from '@/shared/utils';

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

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

export function uniqueStrings(items) {
  return Array.from(
    new Set(
      toArray(items)
        .map((item) => normalizeValue(item))
        .filter(Boolean),
    ),
  );
}

export function resolvePrimaryProvider(providerIds = []) {
  const normalizedProviderIds = uniqueStrings(
    providerIds.map((p) => normalizeProviderId(p)).filter(Boolean),
  );

  if (normalizedProviderIds.includes(PASSWORD_PROVIDER_ID)) return PASSWORD_PROVIDER_ID;
  if (normalizedProviderIds.includes(GOOGLE_PROVIDER_ID)) return 'google';
  if (normalizedProviderIds.includes(GITHUB_PROVIDER_ID)) return 'github';

  return normalizeOAuthProvider(normalizedProviderIds[0]) || normalizedProviderIds[0] || null;
}

export function resolveAuthCapabilities({ providerIds = [], email = null } = {}) {
  const uniqueProviderIds = uniqueStrings(
    providerIds.map((p) => normalizeProviderId(p)).filter(Boolean),
  );
  const passwordEnabled = uniqueProviderIds.includes(PASSWORD_PROVIDER_ID);
  const oauthProviderIds = getEnabledOAuthProviderIds(uniqueProviderIds);
  const oauthEnabled = oauthProviderIds.length > 0;
  const googleEnabled = uniqueProviderIds.includes(GOOGLE_PROVIDER_ID);
  const githubEnabled = uniqueProviderIds.includes(GITHUB_PROVIDER_ID);
  const primaryProvider = resolvePrimaryProvider(uniqueProviderIds);

  return {
    passwordEnabled,
    oauthEnabled,
    oauthProviderIds,
    googleEnabled,
    githubEnabled,
    primaryProvider,
    needsPasswordSetup: oauthEnabled && !passwordEnabled,
    canResetPassword: passwordEnabled && Boolean(normalizeEmailValue(email)),
  };
}

export function getCsrfToken() {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp('(?:^|; )tvz_csrf=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : '';
}

export function createCsrfHeaders(headers = {}) {
  const csrfToken = getCsrfToken();
  if (!csrfToken) return headers;
  return { ...headers, 'X-CSRF-Token': csrfToken };
}

export function sanitizeAuthNextPath(nextPath, fallback = '/account') {
  const rawValue = normalizeValue(nextPath);
  if (!rawValue || !rawValue.startsWith('/')) return fallback;
  return rawValue;
}

export function resolveOAuthIntent(payload = {}, provider = null, fallback = 'sign-in') {
  const normalizedProvider = normalizeOAuthProvider(provider);
  return payload?.intent || payload?.oauthIntent || fallback;
}

export function buildOAuthCallbackUrl({ intent = 'sign-in', nextPath = '/account', origin, provider } = {}) {
  const normalizedOrigin = origin ? new URL(origin).origin : '';
  const normalizedProvider = normalizeOAuthProvider(provider);
  if (!normalizedOrigin || !normalizedProvider) return '';
  // PKCE's code verifier lives in an SSR cookie. Exchange the authorization
  // code in a route handler so the verifier and resulting session cookies are
  // read and written in the same server response.
  const url = new URL('/api/auth/callback', normalizedOrigin);
  url.searchParams.set('next', sanitizeAuthNextPath(nextPath));
  url.searchParams.set('intent', intent);
  url.searchParams.set('provider', normalizedProvider);
  return url.toString();
}
