export const AUTH_CHALLENGE_TABLE = 'auth_challenges';
export const AUTH_AUDIT_TABLE = 'auth_audit_logs';
export const ACCOUNT_LIFECYCLE_TABLE = 'account_lifecycle';

export const AUTH_PURPOSE = Object.freeze({
  ACCOUNT_REAUTH: 'account-reauth',
  SIGN_IN: 'sign-in',
  SIGN_UP: 'sign-up',
});

export const PURPOSES = Object.freeze({
  ACCOUNT_DELETE: 'account-delete',
  ACCOUNT_REAUTH: 'account-reauth',
  EMAIL_CHANGE: 'email-change',
  SIGN_IN: 'sign-in',
  SIGN_UP: 'sign-up',
});

export const SECURE_PURPOSES = new Set([
  PURPOSES.ACCOUNT_DELETE,
  PURPOSES.ACCOUNT_REAUTH,
  PURPOSES.EMAIL_CHANGE,
]);

export const EMAIL_VERIFICATION_PURPOSES = new Set([
  PURPOSES.ACCOUNT_DELETE,
  PURPOSES.ACCOUNT_REAUTH,
  PURPOSES.EMAIL_CHANGE,
  PURPOSES.SIGN_IN,
  PURPOSES.SIGN_UP,
]);

export const EMAIL_DOMAIN_PATTERNS = Object.freeze([
  /^(?:gmail\.com|googlemail\.com)$/i,
  /^(?:outlook\.com|hotmail\.com|live\.com|msn\.com)$/i,
  /^(?:yandex\.com|yandex\.ru|yandex\.tr)$/i,
  /^(?:yahoo\.com|yahoo\.co\.uk|yahoo\.de|yahoo\.fr|yahoo\.it|yahoo\.es)$/i,
  /^(?:protonmail\.com|proton\.me)$/i,
  /^(?:icloud\.com|me\.com|mac\.com)$/i,
  /^(?:mail\.ru|gmx\.com|zoho\.com)$/i,
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
export const PENDING_SIGN_IN_MAX_AGE_MS = 30 * 60 * 1000;
export const PENDING_SIGN_IN_MAX_AGE_SECONDS = PENDING_SIGN_IN_MAX_AGE_MS / 1000;

export const GENERIC_VERIFY_ERROR = 'Verification could not be completed';
export const OTP_CODE_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 60 * 1000;
export const MAX_VERIFY_ATTEMPTS = 5;
export const TOKEN_VERSION = 3;

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

export const INITIAL_SIGN_UP_FORM = Object.freeze({
  username: '',
  displayName: '',
  email: '',
});
