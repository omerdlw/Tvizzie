import { createAdminAuthFacade } from '@/core/auth/servers/session/supabase-admin-auth.server';
import { resolveAuthCapabilities, resolveProviderIds } from '@/core/auth/capabilities';
import { createAdminClient } from '@/core/clients/supabase/admin';
import { validateUsername } from '@/core/utils/account';

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeEmail(value) {
  return normalizeValue(value).toLowerCase();
}

export async function resolvePasswordAccountIdentifier(identifier) {
  const normalizedIdentifier = normalizeValue(identifier);

  if (!normalizedIdentifier) {
    throw new Error('Username or email is required');
  }

  if (normalizedIdentifier.includes('@')) {
    return {
      email: normalizeEmail(normalizedIdentifier),
      userId: null,
      username: null,
    };
  }

  const username = validateUsername(normalizedIdentifier);
  const admin = createAdminClient();
  const profileResult = await admin
    .from('profiles')
    .select('id, email, username')
    .eq('username_lower', username)
    .maybeSingle();

  if (profileResult.error) {
    throw new Error(profileResult.error.message || 'Username lookup failed');
  }

  const profile = profileResult.data || null;

  if (!profile?.id || !profile?.email) {
    const error = new Error('No account was found with this username');
    error.code = 'auth/user-not-found';
    throw error;
  }

  return {
    email: normalizeEmail(profile.email),
    userId: normalizeValue(profile.id) || null,
    username: normalizeValue(profile.username) || username,
  };
}

export async function lookupAccountByEmail(email) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Enter a valid email address');
  }

  let userRecord = null;

  try {
    userRecord = await createAdminAuthFacade().getUserByEmail(normalizedEmail);
  } catch (error) {
    const code = normalizeValue(error?.code);
    const message = normalizeValue(error?.message).toLowerCase();

    if (code === 'auth/user-not-found' || message.includes('user not found')) {
      return {
        code: 'auth/user-not-found',
        email: normalizedEmail,
        exists: false,
        providerIds: [],
        supportsPasswordAuth: false,
        userId: null,
      };
    }

    throw error;
  }

  const userId = normalizeValue(userRecord?.uid);
  const providerIds = resolveProviderIds({
    providerData: userRecord?.providerData || [],
    appMetadata: userRecord?.app_metadata || {},
  });
  const authCapabilities = resolveAuthCapabilities({
    providerIds,
    email: normalizedEmail,
  });
  const supportsPasswordAuth = authCapabilities.passwordEnabled;

  return {
    code: null,
    capabilities: authCapabilities,
    email: normalizedEmail,
    exists: Boolean(userId),
    providerIds,
    signInMethods: providerIds,
    supportsPasswordAuth,
    userId: userId || null,
  };
}

export async function lookupPasswordAccountByEmail(email, { requireProfile = false } = {}) {
  const lookup = await lookupAccountByEmail(email);
  const normalizedEmail = lookup.email;
  const userId = lookup.userId;
  const supportsPasswordAuth = lookup.supportsPasswordAuth;

  if (!userId) {
    return {
      code: lookup.code || 'auth/user-not-found',
      email: normalizedEmail,
      eligible: false,
      exists: false,
      profileEligible: false,
      supportsPasswordAuth: false,
      providerIds: [],
      userId: null,
    };
  }

  if (!supportsPasswordAuth) {
    return {
      code: 'auth/password-sign-in-disabled',
      capabilities: lookup.capabilities,
      email: normalizedEmail,
      eligible: false,
      exists: lookup.exists,
      profileEligible: false,
      supportsPasswordAuth: false,
      providerIds: lookup.providerIds,
      signInMethods: lookup.signInMethods,
      userId: userId || null,
    };
  }

  if (!requireProfile) {
    return {
      code: null,
      capabilities: lookup.capabilities,
      email: normalizedEmail,
      eligible: true,
      exists: true,
      profileEligible: true,
      supportsPasswordAuth: true,
      providerIds: lookup.providerIds,
      signInMethods: lookup.signInMethods,
      userId,
    };
  }

  const admin = createAdminClient();
  const profileResult = await admin.from('profiles').select('id, email').eq('id', userId).maybeSingle();

  if (profileResult.error) {
    throw new Error(profileResult.error.message || 'Profile could not be loaded');
  }

  const profileData = profileResult.data || null;

  if (!profileData) {
    return {
      code: 'auth/password-reset-unavailable',
      capabilities: lookup.capabilities,
      email: normalizedEmail,
      eligible: false,
      exists: true,
      profileEligible: false,
      supportsPasswordAuth: true,
      providerIds: lookup.providerIds,
      signInMethods: lookup.signInMethods,
      userId,
    };
  }

  const profileEmail = normalizeEmail(profileData?.email);
  const profileId = normalizeValue(profileData?.id);
  const profileEligible = profileEmail === normalizedEmail && (!profileId || profileId === userId);

  return {
    code: profileEligible ? null : 'auth/password-reset-unavailable',
    capabilities: lookup.capabilities,
    email: normalizedEmail,
    eligible: profileEligible,
    exists: true,
    profileEligible,
    supportsPasswordAuth: true,
    providerIds: lookup.providerIds,
    signInMethods: lookup.signInMethods,
    userId,
  };
}
