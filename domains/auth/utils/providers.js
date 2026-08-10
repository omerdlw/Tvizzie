import { normalizeEmailValue, normalizeValue } from '@/shared/utils';
import {
  normalizeProviderId,
  resolveAuthCapabilities,
  resolvePrimaryProvider,
  uniqueStrings,
} from '@/core/modules/auth/provider-utils';
import { GOOGLE_PROVIDER_ID, PASSWORD_PROVIDER_ID } from './oauth';

export { resolveAuthCapabilities, resolvePrimaryProvider, uniqueStrings };

export function normalizeProvider(value) {
  return normalizeProviderId(value);
}

function getMetadataProviders(appMetadata = {}) {
  return [
    ...(Array.isArray(appMetadata?.providers) ? appMetadata.providers : []),
    appMetadata?.provider,
    appMetadata?.tvz_password_enabled === true ? PASSWORD_PROVIDER_ID : null,
  ]
    .map(normalizeProvider)
    .filter(Boolean);
}

function getAmrProviders(tokenClaims = {}) {
  return (Array.isArray(tokenClaims?.amr) ? tokenClaims.amr : [])
    .map((entry) => {
      if (typeof entry === 'string') return normalizeValue(entry).toLowerCase();
      if (entry && typeof entry === 'object') {
        return normalizeValue(entry.method || entry.provider || entry.id).toLowerCase();
      }
      return '';
    })
    .map((method) => {
      if (method === PASSWORD_PROVIDER_ID || method === 'pwd' || method === 'email') {
        return PASSWORD_PROVIDER_ID;
      }
      if (method === 'google') return GOOGLE_PROVIDER_ID;
      if (method === 'oauth') return normalizeProvider(tokenClaims?.app_metadata?.provider);
      return null;
    })
    .filter(Boolean);
}

export function resolveProviderIds({
  providerData = [],
  identities = [],
  appMetadata = {},
  tokenClaims = {},
} = {}) {
  const providerIdsFromProviderData = Array.isArray(providerData)
    ? providerData
        .map((provider) => normalizeProvider(provider?.providerId || provider?.id))
        .filter(Boolean)
    : [];
  const providerIdsFromIdentities = Array.isArray(identities)
    ? identities.map((identity) => normalizeProvider(identity?.provider)).filter(Boolean)
    : [];

  return uniqueStrings([
    ...providerIdsFromProviderData,
    ...providerIdsFromIdentities,
    ...getMetadataProviders(appMetadata),
    ...getMetadataProviders(tokenClaims?.app_metadata || {}),
    ...getAmrProviders(tokenClaims),
  ]);
}

export function resolveProviderDescriptors({
  providerData = [],
  identities = [],
  email = null,
  userId = null,
} = {}) {
  const providers = new Map();
  const addProvider = (providerId, providerEmail, uid) => {
    const id = normalizeProvider(providerId);
    if (!id || providers.has(id)) return;

    providers.set(id, {
      email: normalizeEmailValue(providerEmail || email) || null,
      id,
      uid: normalizeValue(uid || userId) || null,
    });
  };

  if (Array.isArray(providerData)) {
    providerData.forEach((provider) => {
      addProvider(
        provider?.providerId || provider?.id,
        provider?.email,
        provider?.uid || provider?.user_id,
      );
    });
  }

  if (Array.isArray(identities)) {
    identities.forEach((identity) => {
      addProvider(
        identity?.provider,
        identity?.identity_data?.email,
        identity?.id || identity?.identity_id || identity?.user_id,
      );
    });
  }

  return Array.from(providers.values());
}
