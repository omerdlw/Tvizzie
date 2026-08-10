import { normalizeEmailValue, normalizeValue } from '@/shared/utils';
import {
  normalizeProvider,
  resolveProviderDescriptors as resolveAuthProviderDescriptors,
  resolveProviderIds,
} from '@/domains/auth/utils';
import { GOOGLE_PROVIDER_ID, PASSWORD_PROVIDER_ID } from '@/domains/auth/oauth';
import { createAdminClient } from '@/infrastructure/supabase/admin';
import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} from '@/infrastructure/supabase/supabase-constants';

export const GOOGLE_AUTH_INTENTS = Object.freeze({
  LINK: 'link',
  SIGN_IN: 'sign-in',
  SIGN_UP: 'sign-up',
});

export const GOOGLE_AUTH_RESULTS = Object.freeze({
  ALLOW_LINK: 'allow-link',
  ALLOW_SIGNIN: 'allow-signin',
  ALLOW_SIGNUP: 'allow-signup',
  EMAIL_MISMATCH: 'email-mismatch',
  PROVIDER_COLLISION: 'provider-collision',
  REDIRECT_SIGNUP: 'redirect-signup',
  REQUIRE_PASSWORD_LOGIN: 'require-password-login',
});

export const GOOGLE_SESSION_ERROR_CODES = Object.freeze({
  PASSWORD_LOGIN_REQUIRED: 'GOOGLE_PASSWORD_LOGIN_REQUIRED',
  PROVIDER_COLLISION: 'GOOGLE_PROVIDER_COLLISION',
});

function normalizeIntent(value) {
  const norm = normalizeValue(value).toLowerCase();
  return Object.values(GOOGLE_AUTH_INTENTS).includes(norm) ? norm : GOOGLE_AUTH_INTENTS.SIGN_IN;
}

export async function resolveGoogleAuthIntent({
  currentUserId = null,
  decodedToken = null,
  pageIntent = GOOGLE_AUTH_INTENTS.SIGN_IN,
  userRecord = null,
} = {}) {
  const intent = normalizeIntent(pageIntent);
  const userId = normalizeValue(userRecord?.uid || decodedToken?.uid || decodedToken?.sub);
  const providerDescriptors = resolveAuthProviderDescriptors({
    providerData: Array.isArray(userRecord?.providerData) ? userRecord.providerData : [],
    email: userRecord?.email || decodedToken?.email || null,
    userId: userRecord?.uid || decodedToken?.uid || decodedToken?.sub || null,
  });
  const providerIds = resolveProviderIds({
    providerData: Array.isArray(userRecord?.providerData) ? userRecord.providerData : [],
    appMetadata: userRecord?.app_metadata || {},
    tokenClaims: decodedToken || {},
  });
  const googleProvider = providerDescriptors.find((p) => p.id === GOOGLE_PROVIDER_ID);
  const googleEmail = normalizeEmailValue(
    googleProvider?.email || userRecord?.email || decodedToken?.email,
  );
  const emailVerified = Boolean(userRecord?.emailVerified || decodedToken?.email_verified);
  const hasGoogleProvider = providerIds.includes(GOOGLE_PROVIDER_ID);
  const hasPasswordProvider = providerIds.includes(PASSWORD_PROVIDER_ID);

  let profile = { exists: false, id: null, email: '' };
  if (userId) {
    const admin = createAdminClient();
    const res = await admin.from('profiles').select('id, email').eq('id', userId).maybeSingle();
    if (res.data)
      profile = {
        exists: true,
        id: normalizeValue(res.data.id) || userId,
        email: normalizeEmailValue(res.data.email),
      };
  }

  const baseMetadata = {
    emailVerified,
    googleEmail,
    hasGoogleProvider,
    hasPasswordProvider,
    profileEmail: profile.email,
    profileExists: profile.exists,
    providerDescriptors,
    userId,
  };

  if (!userId || !hasGoogleProvider || !googleEmail || !emailVerified) {
    return { ...baseMetadata, result: GOOGLE_AUTH_RESULTS.PROVIDER_COLLISION };
  }

  if (intent === GOOGLE_AUTH_INTENTS.LINK) {
    if (!currentUserId || normalizeValue(currentUserId) !== userId) {
      return { ...baseMetadata, result: GOOGLE_AUTH_RESULTS.PROVIDER_COLLISION };
    }
    if (!profile.exists || profile.email !== googleEmail) {
      return { ...baseMetadata, result: GOOGLE_AUTH_RESULTS.EMAIL_MISMATCH };
    }
    return { ...baseMetadata, result: GOOGLE_AUTH_RESULTS.ALLOW_LINK };
  }

  if (profile.exists) {
    if (profile.email && profile.email !== googleEmail) {
      return hasPasswordProvider
        ? { ...baseMetadata, result: GOOGLE_AUTH_RESULTS.REQUIRE_PASSWORD_LOGIN }
        : { ...baseMetadata, result: GOOGLE_AUTH_RESULTS.PROVIDER_COLLISION };
    }
    return { ...baseMetadata, result: GOOGLE_AUTH_RESULTS.ALLOW_SIGNIN };
  }

  return intent === GOOGLE_AUTH_INTENTS.SIGN_UP
    ? { ...baseMetadata, result: GOOGLE_AUTH_RESULTS.ALLOW_SIGNUP }
    : { ...baseMetadata, result: GOOGLE_AUTH_RESULTS.REDIRECT_SIGNUP };
}

export function getGoogleIdentity(user = null) {
  const identities = Array.isArray(user?.identities) ? user.identities : [];
  return identities.find((i) => normalizeProvider(i?.provider) === GOOGLE_PROVIDER_ID) || null;
}

export function isGoogleOAuthSession(decodedToken = {}) {
  const amr = Array.isArray(decodedToken?.amr) ? decodedToken.amr : [];
  const amrMethods = amr.map((e) => (typeof e === 'string' ? normalizeValue(e).toLowerCase() : ''));

  if (
    amrMethods.includes(PASSWORD_PROVIDER_ID) ||
    amrMethods.includes('pwd') ||
    amrMethods.includes('email')
  ) {
    return false;
  }
  if (amrMethods.includes('google')) return true;

  const provider = normalizeProvider(
    decodedToken?.app_metadata?.provider ||
      (Array.isArray(decodedToken?.app_metadata?.providers)
        ? decodedToken.app_metadata.providers[0]
        : null),
  );
  return amrMethods.includes('oauth') && provider === GOOGLE_PROVIDER_ID;
}

export async function unlinkIdentityWithAccessToken({
  accessToken,
  identityId,
  fallbackMessage = 'Google provider cleanup failed',
}) {
  const normToken = normalizeValue(accessToken);
  const normId = normalizeValue(identityId);

  if (!normToken || !normId) throw new Error('AccessToken and IdentityId are required');

  const apiKey = SUPABASE_PUBLISHABLE_KEY || SUPABASE_SERVICE_ROLE_KEY;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user/identities/${normId}`, {
    method: 'DELETE',
    headers: { apikey: apiKey, Authorization: `Bearer ${normToken}` },
    cache: 'no-store',
  });

  if (response.ok) return true;
  const payload = await response.json().catch(() => null);
  throw new Error(payload?.msg || payload?.message || fallbackMessage);
}

export async function assertGoogleSessionConsistency({
  decodedToken = {},
  userRecord = null,
} = {}) {
  if (!isGoogleOAuthSession(decodedToken)) return null;

  const result = await resolveGoogleAuthIntent({
    decodedToken,
    pageIntent: GOOGLE_AUTH_INTENTS.SIGN_IN,
    userRecord,
  });
  const shouldReject =
    result?.result === GOOGLE_AUTH_RESULTS.REQUIRE_PASSWORD_LOGIN ||
    (result?.profileExists && result?.result === GOOGLE_AUTH_RESULTS.PROVIDER_COLLISION);

  if (!shouldReject) return result;

  const isPasswordRequired = result?.result === GOOGLE_AUTH_RESULTS.REQUIRE_PASSWORD_LOGIN;
  const error = new Error(
    isPasswordRequired
      ? 'This email is already used by another account. Sign in with your password once to link Google.'
      : 'This Google account is already linked to another account',
  );
  error.code = isPasswordRequired
    ? GOOGLE_SESSION_ERROR_CODES.PASSWORD_LOGIN_REQUIRED
    : GOOGLE_SESSION_ERROR_CODES.PROVIDER_COLLISION;
  error.data = result;
  throw error;
}
