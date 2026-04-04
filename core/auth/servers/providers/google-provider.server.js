import { normalizeProvider } from '@/core/auth/capabilities';
import {
  GOOGLE_AUTH_INTENTS,
  GOOGLE_AUTH_RESULTS,
  resolveGoogleAuthIntent,
} from '@/core/auth/servers/providers/google-auth-intent.server';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from '@/core/clients/supabase/constants';

export const GOOGLE_PROVIDER_ID = 'google.com';

export const GOOGLE_SESSION_ERROR_CODES = Object.freeze({
  PASSWORD_LOGIN_REQUIRED: 'GOOGLE_PASSWORD_LOGIN_REQUIRED',
  PROVIDER_COLLISION: 'GOOGLE_PROVIDER_COLLISION',
});

function normalizeValue(value) {
  return String(value || '').trim();
}

function getSupabaseAuthApiKey() {
  const apiKey = SUPABASE_PUBLISHABLE_KEY || SUPABASE_SERVICE_ROLE_KEY;

  if (!apiKey) {
    throw new Error('Supabase auth environment is not configured');
  }

  return apiKey;
}

function resolveSupabaseResponseMessage(payload, fallbackMessage) {
  if (!payload || typeof payload !== 'object') {
    return fallbackMessage;
  }

  return payload?.msg || payload?.message || payload?.error_description || payload?.error || fallbackMessage;
}

function normalizeAmr(amrInput) {
  const amr = Array.isArray(amrInput) ? amrInput : [];

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
    .filter(Boolean);
}

function resolveOauthProvider(decodedToken = {}) {
  return normalizeProvider(
    decodedToken?.app_metadata?.provider ||
      (Array.isArray(decodedToken?.app_metadata?.providers) ? decodedToken.app_metadata.providers[0] : null)
  );
}

function resolveGoogleSessionError(result, metadata = {}) {
  if (result === GOOGLE_AUTH_RESULTS.REQUIRE_PASSWORD_LOGIN) {
    const error = new Error(
      'This email is already used by another account. Sign in with your password once to link Google.'
    );
    error.code = GOOGLE_SESSION_ERROR_CODES.PASSWORD_LOGIN_REQUIRED;
    error.data = metadata;
    return error;
  }

  const error = new Error('This Google account is already linked to another account');
  error.code = GOOGLE_SESSION_ERROR_CODES.PROVIDER_COLLISION;
  error.data = metadata;
  return error;
}

export function getGoogleIdentity(user = null) {
  const identities = Array.isArray(user?.identities) ? user.identities : [];

  return (
    identities.find((identity) => {
      const providerId = normalizeProvider(identity?.provider);
      return providerId === GOOGLE_PROVIDER_ID;
    }) || null
  );
}

export function isGoogleOAuthSession(decodedToken = {}) {
  const amrMethods = normalizeAmr(decodedToken?.amr);

  if (amrMethods.includes('password') || amrMethods.includes('pwd') || amrMethods.includes('email')) {
    return false;
  }

  if (amrMethods.includes('google')) {
    return true;
  }

  return amrMethods.includes('oauth') && resolveOauthProvider(decodedToken) === GOOGLE_PROVIDER_ID;
}

export async function unlinkIdentityWithAccessToken({
  accessToken,
  identityId,
  fallbackMessage = 'Google provider cleanup failed',
}) {
  const normalizedAccessToken = normalizeValue(accessToken);
  const normalizedIdentityId = normalizeValue(identityId);

  if (!normalizedAccessToken) {
    throw new Error('Authenticated access token is required');
  }

  if (!normalizedIdentityId) {
    throw new Error('Identity ID is required');
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user/identities/${normalizedIdentityId}`, {
    method: 'DELETE',
    headers: {
      apikey: getSupabaseAuthApiKey(),
      Authorization: `Bearer ${normalizedAccessToken}`,
    },
    cache: 'no-store',
  });

  if (response.ok) {
    return true;
  }

  const payload = await response.json().catch(() => null);
  throw new Error(resolveSupabaseResponseMessage(payload, fallbackMessage));
}

export async function assertGoogleSessionConsistency({ decodedToken = {}, userRecord = null } = {}) {
  if (!isGoogleOAuthSession(decodedToken)) {
    return null;
  }

  const result = await resolveGoogleAuthIntent({
    decodedToken,
    pageIntent: GOOGLE_AUTH_INTENTS.SIGN_IN,
    userRecord,
  });

  const shouldReject =
    result?.result === GOOGLE_AUTH_RESULTS.REQUIRE_PASSWORD_LOGIN ||
    (result?.profileExists && result?.result === GOOGLE_AUTH_RESULTS.PROVIDER_COLLISION);

  if (!shouldReject) {
    return result;
  }

  throw resolveGoogleSessionError(result.result, {
    cleanupAttempted: false,
    cleanupErrorMessage: null,
    cleanupSucceeded: false,
    email: result?.profileEmail || result?.googleEmail || null,
    googleEmail: result?.googleEmail || null,
    profileEmail: result?.profileEmail || null,
    userId: result?.userId || null,
  });
}
