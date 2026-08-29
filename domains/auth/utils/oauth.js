import {
  buildOAuthCallbackUrl,
  getOAuthProviderConfig,
  getOAuthProviderId,
  getOAuthProviderLabel,
  getEnabledOAuthProviderIds,
  GITHUB_PROVIDER_ID,
  GOOGLE_PROVIDER_ID,
  X_PROVIDER_ID,
  isSupportedOAuthProvider,
  normalizeOAuthProvider,
  normalizeOAuthIntent,
  normalizeProviderId,
  OAUTH_PROVIDER_CONFIG,
  OAUTH_PROVIDER_KEYS,
  EMAIL_PROVIDER_ID,
  PASSKEY_PROVIDER_ID,
  PASSKEY_PROVIDER_CONFIG,
  getAuthProviderConfig,
  resolveOAuthIntent,
  sanitizeAuthNextPath,
} from '@/modules/auth';

export {
  getOAuthProviderConfig,
  getOAuthProviderId,
  getOAuthProviderLabel,
  getEnabledOAuthProviderIds,
  GITHUB_PROVIDER_ID,
  GOOGLE_PROVIDER_ID,
  X_PROVIDER_ID,
  isSupportedOAuthProvider,
  normalizeOAuthProvider,
  normalizeProviderId,
  OAUTH_PROVIDER_CONFIG,
  OAUTH_PROVIDER_KEYS,
  EMAIL_PROVIDER_ID,
  PASSKEY_PROVIDER_ID,
  PASSKEY_PROVIDER_CONFIG,
  getAuthProviderConfig,
};

export const AUTH_OAUTH_CALLBACK_PATH = '/api/auth/callback';
export const AUTH_DEFAULT_POST_LOGIN_PATH = '/account';

export function getOAuthProviderIcon(value) {
  return getAuthProviderConfig(value)?.icon || null;
}

export { buildOAuthCallbackUrl, normalizeOAuthIntent, resolveOAuthIntent, sanitizeAuthNextPath };
