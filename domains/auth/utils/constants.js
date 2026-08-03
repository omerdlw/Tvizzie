// ============================================================
// Auth System Constants & Initial State Definitions
// ============================================================

export const AUTH_CHALLENGE_TABLE = 'auth_challenges';
export const AUTH_AUDIT_TABLE = 'auth_audit_logs';
export const ACCOUNT_LIFECYCLE_TABLE = 'account_lifecycle';

export const AUTH_PURPOSE = Object.freeze({
  PASSWORD_RESET: 'password-reset',
  SIGN_IN: 'sign-in',
  SIGN_UP: 'sign-up',
});

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

export const EMAIL_DOMAIN_PATTERNS = Object.freeze([
  /^gmail\.com$/i,
  /^outlook\.[a-z.]+$/i,
  /^hotmail\.[a-z.]+$/i,
  /^yandex\.[a-z.]+$/i,
  /^yahoo\.[a-z.]+$/i,
  /^protonmail\.[a-z.]+$/i,
  /^icloud\.com$/i,
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

export const INITIAL_RESET_FLOW = Object.freeze({
  active: false,
  email: '',
  passwordResetProof: '',
  newPassword: '',
  confirmPassword: '',
  isSubmitting: false,
});

export const INITIAL_SIGN_UP_FORM = Object.freeze({
  username: '',
  displayName: '',
  email: '',
  password: '',
  confirmPassword: '',
});
