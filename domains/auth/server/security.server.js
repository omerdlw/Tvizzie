import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { normalizeEmailValue, normalizeLowerValue, normalizeValue } from '@/shared/utils';
import { createClient } from '@supabase/supabase-js';
import {
  AUTH_COOKIE_PATH,
  CSRF_COOKIE_NAME,
  normalizePassword,
  STEP_UP_COOKIE_NAME,
  STEP_UP_MAX_AGE_MS,
  STEP_UP_MAX_AGE_SECONDS,
  validatePasswordRules,
} from '@/domains/auth/utils';
import {
  createCsrfToken,
  getCookieValue,
  isSecureCookieEnvironment,
  setCsrfCookie,
} from './session.server';
import { extractUuid } from './session/admin.server';
import {
  assertSupabaseBrowserEnv,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} from '@/infrastructure/supabase/supabase-constants';
import { RATE_LIMIT_FALLBACK_MODE } from '@/infrastructure/http/http-server';
import { createSignedToken, verifySignedToken } from './tokens.server';

function toBuffer(value) {
  return Buffer.from(normalizeValue(value));
}

export function getCsrfTokenFromCookie(request) {
  return getCookieValue(request, CSRF_COOKIE_NAME);
}

export function getCsrfTokenFromHeader(request) {
  return normalizeValue(request?.headers?.get?.('x-csrf-token'));
}

export function ensureCsrfCookie(response, csrfToken = '') {
  const normalizedToken = normalizeValue(csrfToken) || createCsrfToken();
  setCsrfCookie(response, normalizedToken);
  return normalizedToken;
}

export function validateCsrfRequest(request) {
  const cookieToken = getCsrfTokenFromCookie(request);
  const headerToken = getCsrfTokenFromHeader(request);

  if (!cookieToken || !headerToken) return false;

  const expected = toBuffer(cookieToken);
  const received = toBuffer(headerToken);

  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function assertCsrfRequest(request) {
  if (!validateCsrfRequest(request)) {
    throw new Error('Invalid CSRF token');
  }
}

export function assertCsrfRequestForCookieSession(request) {
  const authorization = normalizeValue(request?.headers?.get?.('authorization'));
  if (authorization.toLowerCase().startsWith('bearer ')) return;
  assertCsrfRequest(request);
}

function getPasswordSecurityClient() {
  assertSupabaseBrowserEnv();
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
}

export function validateStrongPassword(value) {
  return validatePasswordRules(value);
}

export async function verifyPasswordWithIdentityToolkit({ email, password }) {
  const client = getPasswordSecurityClient();
  const normalizedEmail = normalizeEmailValue(email);
  const normalizedPassword = normalizePassword(password);

  if (!normalizedEmail || !normalizedPassword) {
    throw new Error('Current password could not be verified');
  }

  const response = await client.auth.signInWithPassword({
    email: normalizedEmail,
    password: normalizedPassword,
  });

  if (!response.error) return;

  const message = normalizeValue(response.error?.message).toLowerCase();
  if (
    message.includes('invalid login credentials') ||
    message.includes('invalid_credentials') ||
    message.includes('invalid credentials')
  ) {
    throw new Error('Current password is incorrect');
  }

  if (message.includes('user banned') || message.includes('user_disabled')) {
    throw new Error('This account has been disabled');
  }

  throw new Error('Current password could not be verified');
}

export async function createPendingPasswordSignIn({ email, password }) {
  const client = getPasswordSecurityClient();
  const normalizedEmail = normalizeEmailValue(email);

  if (!normalizedEmail || password === undefined || password === null || password === '') {
    const err = new Error('Email and password are required');
    err.code = 'missing_credentials';
    throw err;
  }

  const response = await client.auth.signInWithPassword({
    email: normalizedEmail,
    password: String(password),
  });

  if (response.error) {
    const message = normalizeValue(response.error?.message).toLowerCase();
    if (message.includes('invalid login credentials') || message.includes('invalid_credentials')) {
      const err = new Error(
        'The password you entered is incorrect. Please check your password or reset it.',
      );
      err.code = 'invalid_login_credentials';
      throw err;
    }
    if (message.includes('user banned') || message.includes('user_disabled')) {
      const err = new Error('This account has been disabled');
      err.code = 'auth/user-disabled';
      throw err;
    }
    const err = new Error(
      response.error.message ||
        'The password you entered is incorrect. Please check your password or reset it.',
    );
    err.code = response.error.code || null;
    throw err;
  }

  const session = response.data?.session || null;
  const user = response.data?.user || session?.user || null;
  const accessToken = normalizeValue(session?.access_token);
  const refreshToken = normalizeValue(session?.refresh_token);
  const userId = normalizeValue(user?.id);
  const userEmail = normalizeEmailValue(user?.email || normalizedEmail);

  if (!accessToken || !refreshToken || !userId || !userEmail) {
    throw new Error('Sign in failed');
  }

  return {
    accessToken,
    email: userEmail,
    provider: normalizeValue(session?.user?.app_metadata?.provider) || 'password',
    refreshToken,
    user,
    userId,
  };
}

export const RECENT_REAUTH_COOKIE_NAME = 'tvz_recent_reauth';
export const RECENT_REAUTH_MAX_AGE_MS = 5 * 60 * 1000;
const RECENT_REAUTH_MAX_AGE_SECONDS = RECENT_REAUTH_MAX_AGE_MS / 1000;

function getReauthSecret() {
  const secret =
    normalizeValue(process.env.RECENT_REAUTH_SECRET) ||
    normalizeValue(process.env.STEP_UP_SECRET) ||
    normalizeValue(process.env.EMAIL_VERIFICATION_SECRET);

  if (!secret) {
    throw new Error(
      'RECENT_REAUTH_SECRET is missing on the server and no fallback secret is available',
    );
  }

  return secret;
}

export function createRecentReauthToken({
  email = null,
  expiresAt = Date.now() + RECENT_REAUTH_MAX_AGE_MS,
  sessionJti = null,
  userId,
}) {
  const normalizedUserId = extractUuid(userId) || normalizeValue(userId);
  if (!normalizedUserId) throw new Error('Recent reauthentication requires a userId');

  const payload = {
    email: normalizeEmailValue(email) || null,
    exp: Math.floor(Number(expiresAt) / 1000),
    sessionJti: normalizeValue(sessionJti) || null,
    userId: normalizedUserId,
  };

  return createSignedToken(payload, { secret: getReauthSecret() });
}

export function verifyRecentReauthToken(token) {
  const payload = verifySignedToken(token, {
    invalidMessage: 'Recent authentication is required',
    secret: getReauthSecret(),
  });

  const expiresAtMs = Number(payload?.exp) * 1000;
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    throw new Error('Recent authentication is required');
  }

  return {
    email: normalizeEmailValue(payload?.email) || null,
    expiresAt: new Date(expiresAtMs).toISOString(),
    sessionJti: normalizeValue(payload?.sessionJti) || null,
    userId: normalizeValue(payload?.userId) || null,
  };
}

export function readRecentReauthFromRequest(request) {
  const token = getCookieValue(request, RECENT_REAUTH_COOKIE_NAME);
  if (!token) return null;
  return verifyRecentReauthToken(token);
}

export function assertRecentReauth(request, { email = null, sessionJti = null, userId }) {
  const reauth = readRecentReauthFromRequest(request);
  const expectedUserId = extractUuid(userId) || normalizeValue(userId);
  const expectedSessionJti = normalizeValue(sessionJti);
  const expectedEmail = normalizeEmailValue(email);

  if (!reauth) throw new Error('Recent authentication is required');
  if (!expectedUserId || reauth.userId !== expectedUserId)
    throw new Error('Recent authentication is required');
  if (expectedSessionJti && reauth.sessionJti !== expectedSessionJti)
    throw new Error('Recent authentication is required');
  if (expectedEmail && reauth.email && reauth.email !== expectedEmail)
    throw new Error('Recent authentication is required');

  return reauth;
}

export function setRecentReauthCookie(response, token) {
  response.cookies.set(RECENT_REAUTH_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: RECENT_REAUTH_MAX_AGE_SECONDS,
    path: AUTH_COOKIE_PATH,
    sameSite: 'strict',
    secure: isSecureCookieEnvironment(),
  });
}

export function clearRecentReauthCookie(response) {
  response.cookies.set(RECENT_REAUTH_COOKIE_NAME, '', {
    httpOnly: true,
    maxAge: 0,
    path: AUTH_COOKIE_PATH,
    sameSite: 'strict',
    secure: isSecureCookieEnvironment(),
  });
}

function getStepUpSecret() {
  const secret =
    normalizeValue(process.env.STEP_UP_SECRET) ||
    normalizeValue(process.env.EMAIL_VERIFICATION_SECRET);
  if (!secret)
    throw new Error('STEP_UP_SECRET is missing on the server and no fallback secret is available');
  return secret;
}

export function createStepUpToken({
  challengeJti = null,
  email = null,
  purpose,
  userId,
  expiresAt = Date.now() + STEP_UP_MAX_AGE_MS,
}) {
  const normalizedPurpose = normalizeLowerValue(purpose);
  const normalizedUserId = extractUuid(userId) || normalizeValue(userId);

  if (!normalizedPurpose || !normalizedUserId) {
    throw new Error('Step-up purpose and userId are required');
  }

  const payload = {
    exp: Math.floor(Number(expiresAt) / 1000),
    jti: normalizeValue(challengeJti) || randomBytes(12).toString('hex'),
    email: normalizeEmailValue(email) || null,
    purpose: normalizedPurpose,
    userId: normalizedUserId,
  };

  return createSignedToken(payload, { secret: getStepUpSecret() });
}

export function verifyStepUpToken(token) {
  const payload = verifySignedToken(token, {
    invalidMessage: 'Invalid step-up token',
    secret: getStepUpSecret(),
  });

  const expiresAtMs = Number(payload?.exp) * 1000;
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    throw new Error('Step-up verification expired');
  }

  return {
    challengeJti: normalizeValue(payload?.jti) || null,
    email: normalizeEmailValue(payload?.email) || null,
    expiresAt: new Date(expiresAtMs).toISOString(),
    purpose: normalizeLowerValue(payload?.purpose),
    userId: normalizeValue(payload?.userId) || null,
  };
}

export function readStepUpFromRequest(request) {
  const token = getCookieValue(request, STEP_UP_COOKIE_NAME);
  if (!token) return null;
  return verifyStepUpToken(token);
}

export function listStepUpPurposes(stepUpPayload = null) {
  const purpose = normalizeLowerValue(stepUpPayload?.purpose);
  return purpose ? [purpose] : [];
}

export function assertStepUp(request, { purpose, userId, email = null }) {
  const stepUp = readStepUpFromRequest(request);
  const expectedPurpose = normalizeLowerValue(purpose);
  const expectedUserId = extractUuid(userId) || normalizeValue(userId);
  const expectedEmail = normalizeEmailValue(email);

  if (!stepUp) throw new Error('Step-up verification is required');
  if (stepUp.userId !== expectedUserId) throw new Error('Step-up verification is invalid');

  const purposeList = stepUp.purpose
    .split(':')
    .map((item) => normalizeLowerValue(item))
    .filter(Boolean);

  if (!purposeList.includes(expectedPurpose)) throw new Error('Step-up verification is invalid');
  if (expectedEmail && stepUp.email !== expectedEmail)
    throw new Error('Step-up verification is invalid');

  return stepUp;
}

export function setStepUpCookie(response, token) {
  response.cookies.set(STEP_UP_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: STEP_UP_MAX_AGE_SECONDS,
    path: AUTH_COOKIE_PATH,
    sameSite: 'strict',
    secure: isSecureCookieEnvironment(),
  });
}

export function clearStepUpCookie(response) {
  response.cookies.set(STEP_UP_COOKIE_NAME, '', {
    httpOnly: true,
    maxAge: 0,
    path: AUTH_COOKIE_PATH,
    sameSite: 'strict',
    secure: isSecureCookieEnvironment(),
  });
}

class SlidingWindowRateLimitError extends Error {
  constructor({ message, retryAfterMs, dimension, key }) {
    super(message || 'Too many requests. Please try again later');
    this.name = 'SlidingWindowRateLimitError';
    this.code = 'RATE_LIMIT_EXCEEDED';
    this.status = 429;
    this.retryAfterMs = Math.max(1000, Number(retryAfterMs) || 1000);
    this.retryAfterSeconds = Math.ceil(this.retryAfterMs / 1000);
    this.dimension = dimension || null;
    this.key = key || null;
  }
}

export function isSlidingWindowRateLimitError(error) {
  return error?.code === 'RATE_LIMIT_EXCEEDED';
}

const MEMORY_STORE_KEY = '__tvizzie_auth_rate_limit_memory_store__';

function getMemoryStore() {
  if (!globalThis[MEMORY_STORE_KEY]) {
    globalThis[MEMORY_STORE_KEY] = new Map();
  }
  return globalThis[MEMORY_STORE_KEY];
}

export async function enforceSlidingWindowRateLimit({
  namespace,
  windowMs = 15 * 60 * 1000,
  dimensions = [],
  message = 'Too many requests. Please try again later',
}) {
  const normalizedNamespace = normalizeLowerValue(namespace);
  if (!normalizedNamespace) throw new Error('Rate limit namespace is required');

  const normalizedWindowMs = Math.max(1000, Number(windowMs) || 1000);
  const validDimensions = (Array.isArray(dimensions) ? dimensions : [])
    .map((d) => ({
      id: normalizeLowerValue(d?.id),
      limit: Number(d?.limit) || 0,
      value: normalizeLowerValue(d?.value),
    }))
    .filter((d) => Boolean(d.id && d.value && d.limit > 0));

  if (!validDimensions.length) return;

  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    const internalToken = normalizeValue(process.env.INFRA_INTERNAL_TOKEN);
    if (internalToken) {
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/rate-limit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'x-infra-internal-token': internalToken,
          },
          body: JSON.stringify({
            dimensions: validDimensions,
            message,
            namespace: normalizedNamespace,
            windowMs: normalizedWindowMs,
          }),
          cache: 'no-store',
        });
        const payload = await response.json().catch(() => ({}));
        if (payload?.allowed === false) {
          throw new SlidingWindowRateLimitError({
            message,
            retryAfterMs: payload?.retryAfterMs,
            dimension: normalizeLowerValue(payload?.dimension) || null,
            key: `${normalizedNamespace}:${normalizeLowerValue(payload?.dimension)}`,
          });
        }
        if (response.ok) return;
      } catch (err) {
        if (isSlidingWindowRateLimitError(err)) throw err;
      }
    }
  }

  const now = Date.now();
  const bucket = Math.floor(now / normalizedWindowMs);
  const store = getMemoryStore();

  for (const dimension of validDimensions) {
    const key = `${normalizedNamespace}:${dimension.id}:${createHash('sha256').update(dimension.value).digest('hex')}:${bucket}`;
    const current = Number(store.get(key) || 0) + 1;
    store.set(key, current);

    if (current > dimension.limit) {
      const retryAfterMs = normalizedWindowMs - (now - bucket * normalizedWindowMs);
      throw new SlidingWindowRateLimitError({
        message,
        retryAfterMs,
        dimension: dimension.id,
        key,
      });
    }
  }
}

export const AUTH_RATE_LIMIT_POLICIES = Object.freeze({
  SIGN_IN: Object.freeze({
    dimensions: Object.freeze({ device: 12, email: 8, ip: 30 }),
    dimensionMessages: Object.freeze({
      default: 'Too many sign-in attempts from this network',
      device: 'Too many sign-in attempts from this device',
      email: 'Too many sign-in attempts for this account',
    }),
    message: 'Too many sign-in attempts',
    namespace: 'auth:sign-in',
    windowMs: 15 * 60 * 1000,
  }),
  VERIFICATION_SEND: Object.freeze({
    dimensions: Object.freeze({ device: 8, email: 5, ip: 20 }),
    dimensionMessages: Object.freeze({
      default: 'Too many verification requests from this network',
      device: 'Too many verification requests from this device',
      email: 'Too many verification requests for this email',
    }),
    message: 'Too many verification requests',
    namespace: 'auth:verification-send',
    windowMs: 15 * 60 * 1000,
  }),
  VERIFICATION_VERIFY: Object.freeze({
    dimensions: Object.freeze({ device: 20, email: 12, ip: 40 }),
    dimensionMessages: Object.freeze({
      default: 'Too many verification attempts from this network',
      device: 'Too many verification attempts from this device',
      email: 'Too many verification attempts for this email',
    }),
    message: 'Too many verification attempts',
    namespace: 'auth:verification-verify',
    windowMs: 15 * 60 * 1000,
  }),
  ACCOUNT_DELETE: Object.freeze({
    dimensions: Object.freeze({ device: 6, ip: 10, user: 4 }),
    dimensionMessages: Object.freeze({
      default: 'Too many account deletion attempts from this network',
      device: 'Too many account deletion attempts from this device',
      user: 'Too many account deletion attempts for this account',
    }),
    message: 'Too many account deletion attempts',
    namespace: 'auth:account-delete',
    windowMs: 15 * 60 * 1000,
  }),
  EMAIL_CHANGE_COMPLETE: Object.freeze({
    dimensions: Object.freeze({ device: 12, ip: 20, user: 8 }),
    dimensionMessages: Object.freeze({
      default: 'Too many email change attempts from this network',
      device: 'Too many email change attempts from this device',
      user: 'Too many email change attempts for this account',
    }),
    message: 'Too many email change attempts',
    namespace: 'auth:email-change:complete',
    windowMs: 15 * 60 * 1000,
  }),
  PASSWORD_CHANGE_COMPLETE: Object.freeze({
    dimensions: Object.freeze({ device: 12, ip: 20, user: 8 }),
    dimensionMessages: Object.freeze({
      default: 'Too many password change attempts from this network',
      device: 'Too many password change attempts from this device',
      user: 'Too many password change attempts for this account',
    }),
    message: 'Too many password change attempts',
    namespace: 'auth:password-change:complete',
    windowMs: 15 * 60 * 1000,
  }),
  PASSWORD_RESET_COMPLETE: Object.freeze({
    dimensions: Object.freeze({ device: 12, email: 6, ip: 24 }),
    dimensionMessages: Object.freeze({
      default: 'Too many password reset attempts from this network',
      device: 'Too many password reset attempts from this device',
      email: 'Too many password reset attempts for this email',
    }),
    message: 'Too many password reset attempts',
    namespace: 'auth:password-reset:complete',
    windowMs: 15 * 60 * 1000,
  }),
  PASSWORD_SET_COMPLETE: Object.freeze({
    dimensions: Object.freeze({ device: 12, ip: 20, user: 8 }),
    dimensionMessages: Object.freeze({
      default: 'Too many password setup attempts from this network',
      device: 'Too many password setup attempts from this device',
      user: 'Too many password setup attempts for this account',
    }),
    message: 'Too many password setup attempts',
    namespace: 'auth:password-set:complete',
    windowMs: 15 * 60 * 1000,
  }),
  SIGN_UP_COMPLETE: Object.freeze({
    dimensions: Object.freeze({ device: 12, email: 6, ip: 24 }),
    dimensionMessages: Object.freeze({
      default: 'Too many sign-up attempts from this network',
      device: 'Too many sign-up attempts from this device',
      email: 'Too many sign-up attempts for this email',
    }),
    message: 'Too many sign-up attempts',
    namespace: 'auth:sign-up:complete',
    windowMs: 15 * 60 * 1000,
  }),
});

export const AUTH_RATE_LIMIT_POLICY_KEYS = Object.freeze(
  Object.keys(AUTH_RATE_LIMIT_POLICIES).reduce((acc, key) => {
    acc[key] = key;
    return acc;
  }, {}),
);

export async function enforceAuthRateLimit(policyKey, { dimensionValues = {} } = {}) {
  const key = normalizeLowerValue(policyKey).toUpperCase();
  const policy = AUTH_RATE_LIMIT_POLICIES[key];

  if (!policy) throw new Error(`Unknown auth rate-limit policy: ${policyKey}`);

  const dimensions = Object.entries(policy.dimensions || {}).map(([id, limit]) => ({
    id,
    limit,
    value: dimensionValues?.[id],
  }));

  try {
    await enforceSlidingWindowRateLimit({
      dimensions,
      message: policy.message,
      namespace: policy.namespace,
      windowMs: policy.windowMs,
    });
  } catch (error) {
    if (!isSlidingWindowRateLimitError(error)) throw error;
    const dim = normalizeLowerValue(error.dimension);
    const msg =
      (dim && policy.dimensionMessages?.[dim]) ||
      policy.dimensionMessages?.default ||
      policy.message;
    throw new Error(msg);
  }
}
