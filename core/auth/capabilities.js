import { getEnabledOAuthProviderIds, normalizeOAuthProvider, normalizeProviderId } from '@/core/auth/oauth-providers';

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeEmail(value) {
  return normalizeValue(value).toLowerCase();
}

function toArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === undefined || value === null || value === '') {
    return [];
  }

  return [value];
}

export function uniqueStrings(items) {
  return Array.from(
    new Set(
      toArray(items)
        .map((item) => normalizeValue(item))
        .filter(Boolean)
    )
  );
}

export function normalizeProvider(value) {
  return normalizeProviderId(value);
}

function getMetadataProviders(appMetadata = {}) {
  return [
    ...(Array.isArray(appMetadata?.providers) ? appMetadata.providers : []),
    appMetadata?.provider,
    appMetadata?.tvz_password_enabled === true ? 'password' : null,
  ]
    .map((provider) => normalizeProvider(provider))
    .filter(Boolean);
}

function getAmrProviders(tokenClaims = {}) {
  const amr = Array.isArray(tokenClaims?.amr) ? tokenClaims.amr : [];

  return amr
    .map((entry) => {
      if (typeof entry === 'string') {
        return normalizeValue(entry).toLowerCase();
      }

      if (entry && typeof entry === 'object') {
        return normalizeValue(entry.method || entry.provider || entry.id).toLowerCase();
      }

      return '';
    })
    .map((method) => {
      if (!method) {
        return null;
      }

      if (method === 'password' || method === 'pwd' || method === 'email') {
        return 'password';
      }

      if (method === 'google') {
        return 'google.com';
      }

      if (method === 'oauth') {
        return normalizeProvider(tokenClaims?.app_metadata?.provider);
      }

      return null;
    })
    .filter(Boolean);
}

export function resolveProviderIds({ providerData = [], identities = [], appMetadata = {}, tokenClaims = {} } = {}) {
  const providerIdsFromProviderData = Array.isArray(providerData)
    ? providerData.map((provider) => normalizeProvider(provider?.providerId || provider?.id)).filter(Boolean)
    : [];

  const providerIdsFromIdentities = Array.isArray(identities)
    ? identities.map((identity) => normalizeProvider(identity?.provider)).filter(Boolean)
    : [];

  const providerIdsFromMetadata = getMetadataProviders(appMetadata);
  const providerIdsFromTokenMetadata = getMetadataProviders(tokenClaims?.app_metadata || {});

  return uniqueStrings([
    ...providerIdsFromProviderData,
    ...providerIdsFromIdentities,
    ...providerIdsFromMetadata,
    ...providerIdsFromTokenMetadata,
    ...getAmrProviders(tokenClaims),
  ]);
}

export function resolveProviderDescriptors({ providerData = [], identities = [], email = null, userId = null } = {}) {
  const providerMap = new Map();

  if (Array.isArray(providerData)) {
    providerData.forEach((provider) => {
      const providerId = normalizeProvider(provider?.providerId || provider?.id);

      if (!providerId || providerMap.has(providerId)) {
        return;
      }

      providerMap.set(providerId, {
        email: normalizeEmail(provider?.email || email) || null,
        id: providerId,
        uid: normalizeValue(provider?.uid || provider?.user_id || userId) || null,
      });
    });
  }

  if (Array.isArray(identities)) {
    identities.forEach((identity) => {
      const providerId = normalizeProvider(identity?.provider);

      if (!providerId || providerMap.has(providerId)) {
        return;
      }

      providerMap.set(providerId, {
        email: normalizeEmail(identity?.identity_data?.email || email) || null,
        id: providerId,
        uid: normalizeValue(identity?.id || identity?.identity_id || identity?.user_id || userId) || null,
      });
    });
  }

  return Array.from(providerMap.values());
}

export function resolvePrimaryProvider(providerIds = []) {
  const normalizedProviderIds = uniqueStrings(
    providerIds.map((providerId) => normalizeProvider(providerId)).filter(Boolean)
  );

  if (normalizedProviderIds.includes('password')) {
    return 'password';
  }

  if (normalizedProviderIds.includes('google.com')) {
    return 'google';
  }

  if (normalizedProviderIds.includes('github')) {
    return 'github';
  }

  return normalizeOAuthProvider(normalizedProviderIds[0]) || normalizedProviderIds[0] || null;
}

export function resolveAuthCapabilities({ providerIds = [], email = null } = {}) {
  const uniqueProviderIds = uniqueStrings(
    providerIds.map((providerId) => normalizeProvider(providerId)).filter(Boolean)
  );
  const passwordEnabled = uniqueProviderIds.includes('password');
  const oauthProviderIds = getEnabledOAuthProviderIds(uniqueProviderIds);
  const oauthEnabled = oauthProviderIds.length > 0;
  const googleEnabled = uniqueProviderIds.includes('google.com');
  const githubEnabled = uniqueProviderIds.includes('github');
  const primaryProvider = resolvePrimaryProvider(uniqueProviderIds);

  return {
    passwordEnabled,
    oauthEnabled,
    oauthProviderIds,
    googleEnabled,
    githubEnabled,
    primaryProvider,
    needsPasswordSetup: oauthEnabled && !passwordEnabled,
    canResetPassword: passwordEnabled && Boolean(normalizeEmail(email)),
  };
}
