import { normalizeEmailValue, normalizeValue } from '@/shared/utils';
import {
  getEnabledOAuthProviderIds,
  GITHUB_PROVIDER_ID,
  GOOGLE_PROVIDER_ID,
  normalizeOAuthProvider,
  normalizeProviderId,
  PASSWORD_PROVIDER_ID,
} from '@/domains/auth/oauth-providers';

// ============================================================
// Password Validation & Evaluation Utilities
// ============================================================

export function normalizePassword(value) {
  return String(value || '');
}

const PASSWORD_REQUIREMENTS = Object.freeze([
  Object.freeze({
    id: 'length',
    label: 'At least 8 characters',
  }),
  Object.freeze({
    id: 'number',
    label: 'At least 1 number',
  }),
]);

export function evaluatePasswordRules(value) {
  const password = normalizePassword(value);

  return PASSWORD_REQUIREMENTS.map((requirement) => {
    if (requirement.id === 'length') {
      return {
        ...requirement,
        satisfied: password.length >= 8,
      };
    }

    if (requirement.id === 'number') {
      return {
        ...requirement,
        satisfied: /\d/.test(password),
      };
    }

    return {
      ...requirement,
      satisfied: false,
    };
  });
}

export function arePasswordRulesSatisfied(value) {
  return evaluatePasswordRules(value).every((requirement) => requirement.satisfied);
}

export function validatePasswordRules(value) {
  const password = normalizePassword(value);

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  if (!/\d/.test(password)) {
    throw new Error('Password must contain at least 1 number');
  }

  return password;
}

// ============================================================
// Auth Capabilities & Provider Utilities
// ============================================================

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
        .filter(Boolean),
    ),
  );
}

export function normalizeProvider(value) {
  return normalizeProviderId(value);
}

function getMetadataProviders(appMetadata = {}) {
  return [
    ...(Array.isArray(appMetadata?.providers) ? appMetadata.providers : []),
    appMetadata?.provider,
    appMetadata?.tvz_password_enabled === true ? PASSWORD_PROVIDER_ID : null,
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

      if (method === PASSWORD_PROVIDER_ID || method === 'pwd' || method === 'email') {
        return PASSWORD_PROVIDER_ID;
      }

      if (method === 'google') {
        return GOOGLE_PROVIDER_ID;
      }

      if (method === 'oauth') {
        return normalizeProvider(tokenClaims?.app_metadata?.provider);
      }

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

export function resolveProviderDescriptors({
  providerData = [],
  identities = [],
  email = null,
  userId = null,
} = {}) {
  const providerMap = new Map();

  if (Array.isArray(providerData)) {
    providerData.forEach((provider) => {
      const providerId = normalizeProvider(provider?.providerId || provider?.id);

      if (!providerId || providerMap.has(providerId)) {
        return;
      }

      providerMap.set(providerId, {
        email: normalizeEmailValue(provider?.email || email) || null,
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
        email: normalizeEmailValue(identity?.identity_data?.email || email) || null,
        id: providerId,
        uid:
          normalizeValue(identity?.id || identity?.identity_id || identity?.user_id || userId) ||
          null,
      });
    });
  }

  return Array.from(providerMap.values());
}

export function resolvePrimaryProvider(providerIds = []) {
  const normalizedProviderIds = uniqueStrings(
    providerIds.map((providerId) => normalizeProvider(providerId)).filter(Boolean),
  );

  if (normalizedProviderIds.includes(PASSWORD_PROVIDER_ID)) {
    return PASSWORD_PROVIDER_ID;
  }

  if (normalizedProviderIds.includes(GOOGLE_PROVIDER_ID)) {
    return 'google';
  }

  if (normalizedProviderIds.includes(GITHUB_PROVIDER_ID)) {
    return 'github';
  }

  return normalizeOAuthProvider(normalizedProviderIds[0]) || normalizedProviderIds[0] || null;
}

export function resolveAuthCapabilities({ providerIds = [], email = null } = {}) {
  const uniqueProviderIds = uniqueStrings(
    providerIds.map((providerId) => normalizeProvider(providerId)).filter(Boolean),
  );
  const passwordEnabled = uniqueProviderIds.includes(PASSWORD_PROVIDER_ID);
  const oauthProviderIds = getEnabledOAuthProviderIds(uniqueProviderIds);
  const oauthEnabled = oauthProviderIds.length > 0;
  const googleEnabled = uniqueProviderIds.includes(GOOGLE_PROVIDER_ID);
  const githubEnabled = uniqueProviderIds.includes(GITHUB_PROVIDER_ID);
  const primaryProvider = resolvePrimaryProvider(uniqueProviderIds);

  return {
    passwordEnabled,
    oauthEnabled,
    oauthProviderIds,
    googleEnabled,
    githubEnabled,
    primaryProvider,
    needsPasswordSetup: oauthEnabled && !passwordEnabled,
    canResetPassword: passwordEnabled && Boolean(normalizeEmailValue(email)),
  };
}

// ============================================================
// Auth Tables, Routes, Error Messages & Session Constants
// ============================================================

export const AUTH_CHALLENGE_TABLE = 'auth_challenges';
export const AUTH_AUDIT_TABLE = 'auth_audit_logs';
export const ACCOUNT_LIFECYCLE_TABLE = 'account_lifecycle';

export const AUTH_ROUTES = Object.freeze({
  SIGN_IN: '/sign-in',
  SIGN_UP: '/sign-up',
});

export const AUTH_PURPOSE = Object.freeze({
  PASSWORD_RESET: 'password-reset',
  SIGN_IN: 'sign-in',
  SIGN_UP: 'sign-up',
});

export const EMAIL_DOMAIN_PATTERNS = Object.freeze([
  /^gmail\.com$/i,
  /^outlook\.[a-z.]+$/i,
  /^hotmail\.[a-z.]+$/i,
  /^yandex\.[a-z.]+$/i,
  /^yahoo\.[a-z.]+$/i,
  /^protonmail\.[a-z.]+$/i,
  /^icloud\.com$/i,
]);

export const AUTH_ERROR_MESSAGES = Object.freeze({
  'auth/email-already-in-use': 'This email address is already in use',
  'auth/invalid-credential': 'The username/email or password is incorrect',
  'auth/invalid-email': 'Enter a valid email address',
  'auth/missing-credentials': 'Sign-in credentials are missing',
  'auth/network-request-failed': 'A network error occurred. Please try again',
  'auth/operation-not-allowed': 'This sign-in method is not available',
  'auth/too-many-requests': 'Too many attempts were made. Please try again later',
  'auth/user-disabled': 'This account has been disabled',
  'auth/user-not-found': 'No account was found with these credentials',
  'auth/weak-password': 'Password is too weak. Use at least 8 characters and 1 number',
  'auth/wrong-password': 'The password is incorrect',
  SIGNIN_IDENTIFIER_REQUIRED: 'Username or email is required',
  PROFILE_EMAIL_MISSING: 'No sign-in email was found for this username. Please contact support',
  USERNAME_TAKEN: 'This username is already taken',
  GOOGLE_EMAIL_UNAVAILABLE:
    'Google account email could not be verified. Try again with a Google account that has a verified email address.',
  GOOGLE_LINK_EMAIL_MISMATCH: 'Google account email must match your current email to link',
  GOOGLE_PASSWORD_LOGIN_REQUIRED:
    'This email is already used by another account. Sign in with your password once to link Google',
  GOOGLE_PROVIDER_COLLISION: 'This Google account is already linked to another account',
  GOOGLE_SIGNUP_REQUIRED: 'No account exists for this Google account. Continue with Sign Up.',
  GOOGLE_UNLINK_REQUIRES_PASSWORD:
    'Google can only be unlinked while email/password sign-in remains enabled',
  INVALID_LOGIN_CREDENTIALS: 'The username/email or password is incorrect',
});

export const AUTH_ERROR_MESSAGE_PATTERNS = Object.freeze([
  ['auth/email-already-in-use', AUTH_ERROR_MESSAGES['auth/email-already-in-use']],
  ['auth/invalid-credential', AUTH_ERROR_MESSAGES['auth/invalid-credential']],
  ['Invalid login credentials', AUTH_ERROR_MESSAGES.INVALID_LOGIN_CREDENTIALS],
  ['invalid_credentials', AUTH_ERROR_MESSAGES.INVALID_LOGIN_CREDENTIALS],
  ['invalid_login_credentials', AUTH_ERROR_MESSAGES.INVALID_LOGIN_CREDENTIALS],
  ['auth/invalid-email', AUTH_ERROR_MESSAGES['auth/invalid-email']],
  ['auth/user-not-found', AUTH_ERROR_MESSAGES['auth/user-not-found']],
  ['auth/wrong-password', AUTH_ERROR_MESSAGES['auth/wrong-password']],
  ['auth/weak-password', AUTH_ERROR_MESSAGES['auth/weak-password']],
  ['auth/too-many-requests', AUTH_ERROR_MESSAGES['auth/too-many-requests']],
  ['auth/network-request-failed', AUTH_ERROR_MESSAGES['auth/network-request-failed']],
  ['GOOGLE_EMAIL_UNAVAILABLE', AUTH_ERROR_MESSAGES.GOOGLE_EMAIL_UNAVAILABLE],
  ['GOOGLE_PASSWORD_LOGIN_REQUIRED', AUTH_ERROR_MESSAGES.GOOGLE_PASSWORD_LOGIN_REQUIRED],
  ['GOOGLE_SIGNUP_REQUIRED', AUTH_ERROR_MESSAGES.GOOGLE_SIGNUP_REQUIRED],
  ['GOOGLE_PROVIDER_COLLISION', AUTH_ERROR_MESSAGES.GOOGLE_PROVIDER_COLLISION],
  ['GOOGLE_LINK_EMAIL_MISMATCH', AUTH_ERROR_MESSAGES.GOOGLE_LINK_EMAIL_MISMATCH],
  ['GOOGLE_UNLINK_REQUIRES_PASSWORD', AUTH_ERROR_MESSAGES.GOOGLE_UNLINK_REQUIRES_PASSWORD],
]);

export const RESERVED_CLAIM_KEYS = new Set([
  'aal',
  'amr',
  'app_metadata',
  'aud',
  'email',
  'exp',
  'iat',
  'iss',
  'phone',
  'role',
  'session_id',
  'sub',
  'user_metadata',
]);

export const LEGACY_CSRF_COOKIE_NAME = 'tvz_csrf';
export const CSRF_COOKIE_NAME = 'tvz_auth_csrf';
export const STEP_UP_COOKIE_NAME = 'tvz_step_up_token';
export const STEP_UP_MAX_AGE_MS = 15 * 60 * 1000;
export const STEP_UP_MAX_AGE_SECONDS = STEP_UP_MAX_AGE_MS / 1000;
export const SUPABASE_FALLBACK_TIMEOUT_MS = 6000;

export const PENDING_SIGN_IN_COOKIE_NAME = 'tvz_login_pending';
export const TRUSTED_DEVICE_COOKIE_PREFIX = 'tvz_login_trust_';
export const PENDING_SIGN_IN_MAX_AGE_MS = 30 * 60 * 1000;
export const PENDING_SIGN_IN_MAX_AGE_SECONDS = PENDING_SIGN_IN_MAX_AGE_MS / 1000;
export const TRUSTED_DEVICE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
export const TRUSTED_DEVICE_MAX_AGE_SECONDS = TRUSTED_DEVICE_MAX_AGE_MS / 1000;

export const GENERIC_VERIFY_ERROR = 'Verification could not be completed';
export const OTP_CODE_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 60 * 1000;
export const MAX_VERIFY_ATTEMPTS = 5;
export const TOKEN_VERSION = 3;

export const PURPOSES = Object.freeze({
  ACCOUNT_DELETE: 'account-delete',
  EMAIL_CHANGE: 'email-change',
  PASSWORD_CHANGE: 'password-change',
  PASSWORD_SET: 'password-set',
  PASSWORD_RESET: 'password-reset',
  PROVIDER_LINK: 'provider-link',
  SIGN_IN: 'sign-in',
  SIGN_UP: 'sign-up',
});

export const SECURE_PURPOSES = new Set([
  PURPOSES.ACCOUNT_DELETE,
  PURPOSES.EMAIL_CHANGE,
  PURPOSES.PASSWORD_CHANGE,
  PURPOSES.PASSWORD_SET,
  PURPOSES.PROVIDER_LINK,
]);

export const AUTH_CHALLENGE_SELECT = [
  'attempt_count',
  'code_hash',
  'dummy',
  'email_hash',
  'expires_at',
  'jti',
  'max_attempts',
  'purpose',
  'resend_available_at',
  'salt',
  'status',
  'used_at',
  'user_id',
].join(',');

export const AUTH_COOKIE_PATH = '/';
export const SUPABASE_BASE64_PREFIX = 'base64-';
export const COOKIE_CHUNK_SUFFIX_PATTERN = /^(.*)\.(\d+)$/;

