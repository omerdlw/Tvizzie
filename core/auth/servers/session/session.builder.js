import 'server-only';

import {
  resolveAuthCapabilities,
  resolvePrimaryProvider,
  resolveProviderDescriptors,
  resolveProviderIds,
  uniqueStrings,
} from '@/core/auth/capabilities';
import { RESERVED_CLAIM_KEYS } from './session.constants';
import { normalizeValue, toIsoDate, toLowercase } from './session.shared';

function resolveCustomClaims(decodedToken = {}) {
  return Object.fromEntries(Object.entries(decodedToken || {}).filter(([key]) => !RESERVED_CLAIM_KEYS.has(key)));
}

function resolveRolesAndCapabilities(decodedToken = {}) {
  const customClaims = resolveCustomClaims(decodedToken);
  const roles = uniqueStrings(customClaims.roles || customClaims.role);
  const permissions = uniqueStrings(customClaims.permissions);
  const capabilities = uniqueStrings([
    ...(Array.isArray(customClaims.capabilities)
      ? customClaims.capabilities
      : customClaims.capabilities
        ? [customClaims.capabilities]
        : []),
    ...permissions,
  ]);

  return {
    capabilities,
    customClaims,
    permissions,
    roles,
  };
}

export function toFirebaseLikeUserRecord(user = null) {
  if (!user?.id) {
    return null;
  }

  const providerData = resolveProviderDescriptors({
    identities: Array.isArray(user?.identities) ? user.identities : [],
    email: user?.email || null,
    userId: user?.id || null,
  }).map((provider) => ({
    email: provider.email,
    providerId: provider.id,
    uid: provider.uid,
  }));

  return {
    app_metadata: user?.app_metadata || {},
    disabled: user?.banned_until != null,
    displayName:
      user?.user_metadata?.full_name || user?.user_metadata?.display_name || user?.user_metadata?.name || null,
    email: toLowercase(user?.email) || null,
    emailVerified: user?.email_confirmed_at != null || user?.confirmed_at != null || false,
    metadata: {
      creationTime: user?.created_at || null,
      lastSignInTime: user?.last_sign_in_at || null,
    },
    photoURL: user?.user_metadata?.avatar_url || user?.user_metadata?.picture || user?.user_metadata?.avatar || null,
    providerData,
    uid: normalizeValue(user?.id),
    user_metadata: user?.user_metadata || {},
  };
}

export function buildSessionUser(decodedToken = {}, userRecord = null) {
  const accessModel = resolveRolesAndCapabilities(decodedToken);
  const providerIds = resolveProviderIds({
    providerData: userRecord?.providerData || [],
    appMetadata: userRecord?.app_metadata || {},
    tokenClaims: decodedToken,
  });
  const providerDescriptors = resolveProviderDescriptors({
    providerData: userRecord?.providerData || [],
    email: userRecord?.email || decodedToken?.email || null,
    userId: userRecord?.uid || decodedToken?.sub || null,
  });
  const authCapabilities = resolveAuthCapabilities({
    providerIds,
    email: userRecord?.email || decodedToken?.email || null,
  });
  const metadata = {
    authCapabilities,
    claims: accessModel.customClaims,
    creationTime: userRecord?.metadata?.creationTime || null,
    emailVerified: Boolean(userRecord?.emailVerified || decodedToken?.email_verified),
    identityCount: providerDescriptors.length,
    lastSignInTime: userRecord?.metadata?.lastSignInTime || null,
    providerDescriptors,
    providerIds,
  };

  return {
    avatarUrl: userRecord?.photoURL || null,
    capabilities: accessModel.capabilities,
    email: toLowercase(userRecord?.email || decodedToken?.email) || null,
    id: normalizeValue(userRecord?.uid || decodedToken?.sub || decodedToken?.uid) || null,
    metadata,
    name: userRecord?.displayName || toLowercase(userRecord?.email || decodedToken?.email) || null,
    permissions: accessModel.permissions,
    roles: accessModel.roles,
  };
}

export function buildNormalizedSession(decodedToken = {}, userRecord = null) {
  const user = buildSessionUser(decodedToken, userRecord);
  const expiresAt = Number(decodedToken?.exp);
  const capabilities = user?.metadata?.authCapabilities || resolveAuthCapabilities();

  return {
    capabilities,
    expiresAt: Number.isFinite(expiresAt) && expiresAt > 0 ? toIsoDate(expiresAt * 1000) : null,
    metadata: user?.metadata || {},
    provider: capabilities.primaryProvider || resolvePrimaryProvider(user?.metadata?.providerIds || []),
    user,
  };
}

function serializeClientSessionUser(user = null) {
  if (!user?.id) {
    return null;
  }

  return {
    avatarUrl: user.avatarUrl || null,
    capabilities: Array.isArray(user.capabilities) ? user.capabilities : [],
    email: toLowercase(user.email) || null,
    id: user.id,
    metadata: {
      authCapabilities: user?.metadata?.authCapabilities || resolveAuthCapabilities(),
      providerIds: Array.isArray(user?.metadata?.providerIds) ? user.metadata.providerIds : [],
    },
    name: user.name || null,
    permissions: Array.isArray(user.permissions) ? user.permissions : [],
    roles: Array.isArray(user.roles) ? user.roles : [],
  };
}

export function serializeSessionState(authContext = null, stepUp = null) {
  if (!authContext?.session) {
    return {
      expiresAt: null,
      status: 'anonymous',
      user: null,
      capabilities: resolveAuthCapabilities(),
      stepUp: {
        purposes: Array.isArray(stepUp?.purposes) ? stepUp.purposes : [],
      },
    };
  }

  const serializedUser = serializeClientSessionUser(authContext.session.user);

  return {
    expiresAt: authContext.session.expiresAt || null,
    status: 'authenticated',
    user: serializedUser,
    capabilities:
      authContext.session.capabilities ||
      authContext.session.metadata?.authCapabilities ||
      resolveAuthCapabilities({
        providerIds: serializedUser?.metadata?.providerIds || [],
      }),
    stepUp: {
      purposes: Array.isArray(stepUp?.purposes) ? stepUp.purposes : [],
    },
  };
}
