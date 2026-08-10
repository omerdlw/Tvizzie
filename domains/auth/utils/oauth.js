import {
  buildOAuthCallbackUrl,
  getOAuthProviderConfig,
  getOAuthProviderId,
  getOAuthProviderLabel,
  getEnabledOAuthProviderIds,
  GITHUB_PROVIDER_ID,
  GOOGLE_PROVIDER_ID,
  isSupportedOAuthProvider,
  normalizeOAuthProvider,
  normalizeOAuthIntent,
  normalizeProviderId,
  OAUTH_PROVIDER_CONFIG,
  OAUTH_PROVIDER_KEYS,
  PASSWORD_PROVIDER_ID,
  resolveOAuthIntent,
  sanitizeAuthNextPath,
} from '@/core/modules/auth/provider-utils';

export {
  getOAuthProviderConfig,
  getOAuthProviderId,
  getOAuthProviderLabel,
  getEnabledOAuthProviderIds,
  GITHUB_PROVIDER_ID,
  GOOGLE_PROVIDER_ID,
  isSupportedOAuthProvider,
  normalizeOAuthProvider,
  normalizeProviderId,
  OAUTH_PROVIDER_CONFIG,
  OAUTH_PROVIDER_KEYS,
  PASSWORD_PROVIDER_ID,
};

export const AUTH_OAUTH_CALLBACK_PATH = '/api/auth/callback';
export const AUTH_DEFAULT_POST_LOGIN_PATH = '/account';

export function getOAuthProviderIcon(value) {
  return getOAuthProviderConfig(value)?.icon || null;
}

export { buildOAuthCallbackUrl, normalizeOAuthIntent, resolveOAuthIntent, sanitizeAuthNextPath };
