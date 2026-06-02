import { resolveAuthCapabilities, resolveProviderIds } from '@/core/auth/capabilities';
import { createAdminClient } from '@/core/clients/supabase/admin';
import { validateUsername } from '@/core/utils/account';
import { normalizeEmailValue, normalizeValue } from '@/core/utils/string';

import { createAdminAuthFacade } from '../session/supabase-admin-auth.server';

import { PASSWORD_ACCOUNT_LOOKUP_CODES } from './password-account.errors';

const PROFILE_BY_USERNAME_SELECT = 'id, email, username';
const PROFILE_BY_USER_ID_SELECT = 'id, email';

function createUserNotFoundError(message) {
  const error = new Error(message);
  error.code = PASSWORD_ACCOUNT_LOOKUP_CODES.USER_NOT_FOUND;
  return error;
}

function createPasswordLookupResult({
  capabilities,
  code = null,
  email,
  eligible,
  exists,
  profileEligible,
  providerIds = [],
  signInMethods,
  supportsPasswordAuth,
  userId,
}) {
  return {
    code,
    capabilities,
    email: normalizeEmailValue(email),
    eligible: Boolean(eligible),
    exists: Boolean(exists),
    profileEligible: Boolean(profileEligible),
    providerIds,
    signInMethods,
    supportsPasswordAuth: Boolean(supportsPasswordAuth),
    userId: normalizeValue(userId) || null,
  };
}

async function getProfileByUsername(username) {
  const profileResult = await createAdminClient()
    .from('profiles')
    .select(PROFILE_BY_USERNAME_SELECT)
    .eq('username_lower', username)
    .maybeSingle();

  if (profileResult.error) {
    throw new Error(profileResult.error.message || 'Username lookup failed');
  }

  return profileResult.data || null;
}

async function getProfileByUserId(userId) {
  const profileResult = await createAdminClient()
    .from('profiles')
    .select(PROFILE_BY_USER_ID_SELECT)
    .eq('id', userId)
    .maybeSingle();

  if (profileResult.error) {
    throw new Error(profileResult.error.message || 'Profile could not be loaded');
  }

  return profileResult.data || null;
}

function createMissingAccountLookup(email) {
  return {
    code: PASSWORD_ACCOUNT_LOOKUP_CODES.USER_NOT_FOUND,
    email,
    exists: false,
    providerIds: [],
    supportsPasswordAuth: false,
    userId: null,
  };
}

function createEligiblePasswordLookup(lookup) {
  return createPasswordLookupResult({
    capabilities: lookup.capabilities,
    code: null,
    email: lookup.email,
    eligible: true,
    exists: true,
    profileEligible: true,
    providerIds: lookup.providerIds,
    signInMethods: lookup.signInMethods,
    supportsPasswordAuth: true,
    userId: lookup.userId,
  });
}

function createIneligiblePasswordLookup({ code, lookup, profileEligible = false }) {
  return createPasswordLookupResult({
    capabilities: lookup.capabilities,
    code,
    email: lookup.email,
    eligible: false,
    exists: Boolean(lookup.exists),
    profileEligible,
    providerIds: lookup.providerIds || [],
    signInMethods: lookup.signInMethods,
    supportsPasswordAuth: code !== PASSWORD_ACCOUNT_LOOKUP_CODES.PASSWORD_SIGN_IN_DISABLED,
    userId: lookup.userId,
  });
}

function resolveLookupFromUserRecord({ normalizedEmail, userRecord }) {
  const userId = normalizeValue(userRecord?.uid);
  const providerIds = resolveProviderIds({
    providerData: userRecord?.providerData || [],
    appMetadata: userRecord?.app_metadata || {},
  });
  const authCapabilities = resolveAuthCapabilities({
    providerIds,
    email: normalizedEmail,
  });

  return {
    capabilities: authCapabilities,
    code: null,
    email: normalizedEmail,
    exists: Boolean(userId),
    providerIds,
    signInMethods: providerIds,
    supportsPasswordAuth: authCapabilities.passwordEnabled,
    userId: userId || null,
  };
}

export async function resolvePasswordAccountIdentifier(identifier) {
  const normalizedIdentifier = normalizeValue(identifier);

  if (!normalizedIdentifier) {
    throw new Error('Username or email is required');
  }

  if (normalizedIdentifier.includes('@')) {
    return {
      email: normalizeEmailValue(normalizedIdentifier),
      userId: null,
      username: null,
    };
  }

  const username = validateUsername(normalizedIdentifier);
  const profile = await getProfileByUsername(username);

  if (!profile?.id || !profile?.email) {
    throw createUserNotFoundError('No account was found with this username');
  }

  return {
    email: normalizeEmailValue(profile.email),
    userId: normalizeValue(profile.id) || null,
    username: normalizeValue(profile.username) || username,
  };
}

export async function lookupAccountByEmail(email) {
  const normalizedEmail = normalizeEmailValue(email);

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Enter a valid email address');
  }

  let userRecord = null;

  try {
    userRecord = await createAdminAuthFacade().getUserByEmail(normalizedEmail);
  } catch (error) {
    const code = normalizeValue(error?.code);
    const message = normalizeValue(error?.message).toLowerCase();

    if (code === PASSWORD_ACCOUNT_LOOKUP_CODES.USER_NOT_FOUND || message.includes('user not found')) {
      return createMissingAccountLookup(normalizedEmail);
    }

    throw error;
  }

  return resolveLookupFromUserRecord({
    normalizedEmail,
    userRecord,
  });
}

export async function lookupPasswordAccountByEmail(email, { requireProfile = false } = {}) {
  const lookup = await lookupAccountByEmail(email);

  if (!lookup.userId) {
    return createPasswordLookupResult({
      code: lookup.code || PASSWORD_ACCOUNT_LOOKUP_CODES.USER_NOT_FOUND,
      email: lookup.email,
      eligible: false,
      exists: false,
      profileEligible: false,
      providerIds: [],
      signInMethods: [],
      supportsPasswordAuth: false,
      userId: null,
    });
  }

  if (!lookup.supportsPasswordAuth) {
    return createIneligiblePasswordLookup({
      code: PASSWORD_ACCOUNT_LOOKUP_CODES.PASSWORD_SIGN_IN_DISABLED,
      lookup,
      profileEligible: false,
    });
  }

  if (!requireProfile) {
    return createEligiblePasswordLookup(lookup);
  }

  const profileData = await getProfileByUserId(lookup.userId);

  if (!profileData) {
    return createIneligiblePasswordLookup({
      code: PASSWORD_ACCOUNT_LOOKUP_CODES.PASSWORD_RESET_UNAVAILABLE,
      lookup,
      profileEligible: false,
    });
  }

  const profileEmail = normalizeEmailValue(profileData?.email);
  const profileId = normalizeValue(profileData?.id);
  const profileEligible = profileEmail === lookup.email && (!profileId || profileId === lookup.userId);

  if (!profileEligible) {
    return createIneligiblePasswordLookup({
      code: PASSWORD_ACCOUNT_LOOKUP_CODES.PASSWORD_RESET_UNAVAILABLE,
      lookup,
      profileEligible: false,
    });
  }

  return createPasswordLookupResult({
    capabilities: lookup.capabilities,
    code: null,
    email: lookup.email,
    eligible: true,
    exists: true,
    profileEligible: true,
    providerIds: lookup.providerIds,
    signInMethods: lookup.signInMethods,
    supportsPasswordAuth: true,
    userId: lookup.userId,
  });
}
