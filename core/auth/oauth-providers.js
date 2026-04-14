const PASSWORD_PROVIDER_ID = 'password';
const DISABLED_PROVIDER_ALIASES = Object.freeze(['apple', 'apple.com']);

export const OAUTH_PROVIDER_CONFIG = Object.freeze({
  github: Object.freeze({
    icon: 'mdi:github',
    id: 'github',
    key: 'github',
    label: 'GitHub',
  }),
  google: Object.freeze({
    icon: 'flat-color-icons:google',
    id: 'google.com',
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
export { PASSWORD_PROVIDER_ID };

function normalizeValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function normalizeOAuthProvider(value) {
  const normalizedValue = normalizeValue(value);

  if (!normalizedValue) {
    return null;
  }

  return OAUTH_PROVIDER_ALIASES[normalizedValue] || null;
}

export function isSupportedOAuthProvider(value) {
  return Boolean(normalizeOAuthProvider(value));
}

export function getOAuthProviderConfig(value) {
  const providerKey = normalizeOAuthProvider(value);

  if (!providerKey) {
    return null;
  }

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

  if (!normalizedValue) {
    return null;
  }

  if (normalizedValue === 'email' || normalizedValue === PASSWORD_PROVIDER_ID) {
    return PASSWORD_PROVIDER_ID;
  }

  if (DISABLED_PROVIDER_ALIASES.includes(normalizedValue)) {
    return null;
  }

  const oauthProviderId = getOAuthProviderId(normalizedValue);

  if (oauthProviderId) {
    return oauthProviderId;
  }

  return normalizedValue;
}

export function getEnabledOAuthProviderIds(providerIds = []) {
  return providerIds
    .map((providerId) => normalizeProviderId(providerId))
    .filter((providerId) => providerId && providerId !== PASSWORD_PROVIDER_ID);
}
