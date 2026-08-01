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
export const STEP_UP_COOKIE_NAME = 'tvz_stepup';
export const STEP_UP_MAX_AGE_MS = 5 * 60 * 1000;
export const STEP_UP_MAX_AGE_SECONDS = STEP_UP_MAX_AGE_MS / 1000;
export const AUTH_COOKIE_PATH = '/';
export const SUPABASE_BASE64_PREFIX = 'base64-';
export const COOKIE_CHUNK_SUFFIX_PATTERN = /^(.*)\.(\d+)$/;
export const SUPABASE_FALLBACK_TIMEOUT_MS = 5000;
