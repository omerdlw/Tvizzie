import 'server-only';
import { createHash } from 'crypto';
import { createServerClient } from '@supabase/ssr';
import { normalizeEmailValue, normalizeValue } from '@/shared/utils';
import { createAdminClient } from '@/infrastructure/supabase/admin';
import {
  assertSupabaseBrowserEnv,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} from '@/infrastructure/supabase/supabase-constants';
import {
  AUTH_COOKIE_PATH,
  CSRF_COOKIE_NAME,
  LEGACY_CSRF_COOKIE_NAME,
  resolveProviderDescriptors,
  STEP_UP_COOKIE_NAME,
  STEP_UP_MAX_AGE_MS,
  STEP_UP_MAX_AGE_SECONDS,
  SUPABASE_FALLBACK_TIMEOUT_MS,
} from '@/domains/auth/utils';

export {
  AUTH_COOKIE_PATH,
  CSRF_COOKIE_NAME,
  STEP_UP_COOKIE_NAME,
  STEP_UP_MAX_AGE_MS,
  STEP_UP_MAX_AGE_SECONDS,
};

// ============================================================
// Cookie & Environment Utilities
// ============================================================

const DEVICE_ID_COOKIE_NAME = 'tvz_device_id';
const DEVICE_ID_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
const DEVICE_ID_MAX_AGE_SECONDS = DEVICE_ID_MAX_AGE_MS / 1000;
const SESSION_CONTROL_FUNCTION = 'session-control';

export function isSecureCookieEnvironment() {
  return process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false';
}

function hashValue(value) {
  const normalized = normalizeValue(value);
  return normalized ? createHash('sha256').update(normalized).digest('hex') : null;
}

function getHeader(request, name) {
  return normalizeValue(request?.headers?.get?.(name));
}

export function getCookieValue(request, cookieName) {
  const cookieHeader = getHeader(request, 'cookie');
  if (!cookieHeader) return '';

  const items = cookieHeader.split(';');
  const prefix = `${cookieName}=`;

  for (const item of items) {
    const normalizedItem = normalizeValue(item);
    if (normalizedItem.startsWith(prefix)) {
      return decodeURIComponent(normalizedItem.slice(prefix.length));
    }
  }
  return '';
}

export function createCsrfToken() {
  return createHash('sha256').update(`${Date.now()}-${Math.random()}`).digest('hex');
}

export function setCsrfCookie(response, token) {
  const normalizedToken = normalizeValue(token);
  if (!normalizedToken) return;

  response.cookies.set(CSRF_COOKIE_NAME, normalizedToken, {
    httpOnly: false,
    maxAge: 86400,
    path: AUTH_COOKIE_PATH,
    sameSite: 'lax',
    secure: isSecureCookieEnvironment(),
  });
}

export function clearCsrfCookie(response) {
  response.cookies.set(CSRF_COOKIE_NAME, '', {
    httpOnly: false,
    maxAge: 0,
    path: AUTH_COOKIE_PATH,
    sameSite: 'lax',
    secure: isSecureCookieEnvironment(),
  });
}

export function clearAuthCookies(response) {
  clearCsrfCookie(response);
  [LEGACY_CSRF_COOKIE_NAME, 'sb-access-token', 'sb-refresh-token'].forEach((cookieName) => {
    response.cookies.set(cookieName, '', {
      httpOnly: true,
      maxAge: 0,
      path: AUTH_COOKIE_PATH,
      sameSite: 'lax',
      secure: isSecureCookieEnvironment(),
    });
  });
}

export function applySessionCookies(response, { accessToken, refreshToken }) {
  if (accessToken) {
    response.cookies.set('sb-access-token', accessToken, {
      httpOnly: true,
      maxAge: 604800,
      path: AUTH_COOKIE_PATH,
      sameSite: 'lax',
      secure: isSecureCookieEnvironment(),
    });
  }
  if (refreshToken) {
    response.cookies.set('sb-refresh-token', refreshToken, {
      httpOnly: true,
      maxAge: 604800,
      path: AUTH_COOKIE_PATH,
      sameSite: 'lax',
      secure: isSecureCookieEnvironment(),
    });
  }
}

export function applySessionCookiesToCookieStore(cookieStore, { accessToken, refreshToken }) {
  if (accessToken) {
    cookieStore.set('sb-access-token', accessToken, {
      httpOnly: true,
      maxAge: 604800,
      path: AUTH_COOKIE_PATH,
      sameSite: 'lax',
      secure: isSecureCookieEnvironment(),
    });
  }
  if (refreshToken) {
    cookieStore.set('sb-refresh-token', refreshToken, {
      httpOnly: true,
      maxAge: 604800,
      path: AUTH_COOKIE_PATH,
      sameSite: 'lax',
      secure: isSecureCookieEnvironment(),
    });
  }
}

// ============================================================
// Request Context & Device Fingerprinting
// ============================================================

function getIpAddress(request) {
  const forwardedFor = getHeader(request, 'x-forwarded-for');
  if (forwardedFor) return normalizeValue(forwardedFor.split(',')[0]);
  return getHeader(request, 'x-real-ip') || getHeader(request, 'cf-connecting-ip') || 'unknown';
}

function resolveDeviceId(request, ipAddress) {
  const explicitDeviceId =
    getHeader(request, 'x-device-id') ||
    getHeader(request, 'x-tvz-device-id') ||
    getCookieValue(request, DEVICE_ID_COOKIE_NAME);

  if (explicitDeviceId) return explicitDeviceId;

  const userAgent = getHeader(request, 'user-agent') || 'unknown';
  const acceptLanguage = getHeader(request, 'accept-language') || 'unknown';
  const clientHints = getHeader(request, 'sec-ch-ua') || 'unknown';
  const fingerprintSeed = `${ipAddress}|${userAgent}|${acceptLanguage}|${clientHints}`;

  return `fp_${createHash('sha256').update(fingerprintSeed).digest('hex').slice(0, 32)}`;
}

export function getRequestContext(request) {
  const ipAddress = getIpAddress(request);
  const deviceId = resolveDeviceId(request, ipAddress);
  const userAgent = getHeader(request, 'user-agent') || null;
  const requestId =
    getHeader(request, 'x-request-id') ||
    getHeader(request, 'x-correlation-id') ||
    getHeader(request, 'x-vercel-id') ||
    null;

  return {
    deviceHash: hashValue(deviceId),
    deviceId,
    ipAddress,
    ipHash: hashValue(ipAddress),
    requestId,
    userAgent,
    userAgentHash: hashValue(userAgent),
  };
}

export function setDeviceIdCookie(response, deviceId) {
  const normalizedDeviceId = normalizeValue(deviceId);
  if (!normalizedDeviceId) return;

  response.cookies.set(DEVICE_ID_COOKIE_NAME, normalizedDeviceId, {
    httpOnly: true,
    maxAge: DEVICE_ID_MAX_AGE_SECONDS,
    path: AUTH_COOKIE_PATH,
    sameSite: 'lax',
    secure: isSecureCookieEnvironment(),
  });
}

// ============================================================
// JWT & Session Context Building
// ============================================================

export function getBearerToken(request) {
  const authHeader = getHeader(request, 'authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  return '';
}

export function hasSessionHint(request, { allowBearer = true } = {}) {
  if (allowBearer && getBearerToken(request)) return true;
  const cookieHeader = getHeader(request, 'cookie');
  return Boolean(cookieHeader && (cookieHeader.includes('sb-') || cookieHeader.includes('tvz_')));
}

export function readSessionFromSupabaseCookies(request) {
  const accessToken = getCookieValue(request, 'sb-access-token');
  const refreshToken = getCookieValue(request, 'sb-refresh-token');
  if (!accessToken) return null;
  return { accessToken, refreshToken };
}

function parseJwtClaims(token) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function buildAuthContextFromAccessToken(token, source = 'session', rawUser = null) {
  const claims = parseJwtClaims(token);
  if (!claims || !claims.sub) {
    throw new Error('Invalid or expired authentication token');
  }

  const expMs = Number(claims.exp) * 1000;
  if (Number.isFinite(expMs) && expMs <= Date.now()) {
    throw new Error('Invalid or expired authentication token');
  }

  return {
    accessToken: token,
    decodedToken: claims,
    email: normalizeEmailValue(claims.email || rawUser?.email) || null,
    sessionJti: claims.session_id || claims.jti || null,
    source,
    userId: claims.sub,
    user: rawUser,
  };
}

export function createSessionFromIdToken(idToken) {
  return buildAuthContextFromAccessToken(idToken, 'idToken');
}

export function buildNormalizedSession(session, user) {
  if (!session?.access_token) return null;
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token || null,
    expiresAt: session.expires_at || null,
    user: user || session.user || null,
  };
}

export function buildSessionUser(user) {
  if (!user?.id) return null;
  return {
    id: user.id,
    email: normalizeEmailValue(user.email) || null,
    appMetadata: user.app_metadata || {},
    userMetadata: user.user_metadata || {},
  };
}

export function serializeSessionState(sessionContext) {
  if (!sessionContext) return null;
  return {
    userId: sessionContext.userId,
    email: sessionContext.email,
    source: sessionContext.source,
  };
}

// ============================================================
// Error Handling & Async Timeout Helpers
// ============================================================

export function isTransientNetworkError(error) {
  const msg = normalizeValue(error?.message).toLowerCase();
  return (
    msg.includes('fetch failed') ||
    msg.includes('network error') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout')
  );
}

export function isTransientSessionError(error) {
  const msg = normalizeValue(error?.message).toLowerCase();
  return msg.includes('timeout') || isTransientNetworkError(error);
}

export function normalizeSupabaseError(error) {
  const message = normalizeValue(error?.message);
  if (!message) return new Error('Supabase request failed');
  const err = new Error(message);
  err.code = error.code || 'SUPABASE_ERROR';
  return err;
}

export function withTimeout(promise, timeoutMs) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

export function createRequestSupabaseClient(request) {
  assertSupabaseBrowserEnv();
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      get: (name) => getCookieValue(request, name),
    },
  });
}

// ============================================================
// Request Session Resolvers & Assertions
// ============================================================

export async function readSessionFromRequest(
  request,
  { allowBearer = true, skipSupabaseFallbackIfNoHint = true, skipSupabaseFallback = false } = {},
) {
  try {
    const bearerToken = allowBearer ? getBearerToken(request) : '';
    if (bearerToken) {
      return buildAuthContextFromAccessToken(bearerToken, 'bearer');
    }

    const cookieSession = readSessionFromSupabaseCookies(request);
    if (cookieSession?.accessToken) {
      return buildAuthContextFromAccessToken(cookieSession.accessToken, 'session');
    }

    if (skipSupabaseFallback) return null;
    if (skipSupabaseFallbackIfNoHint && !hasSessionHint(request, { allowBearer })) return null;

    const supabase = createRequestSupabaseClient(request);
    let userResult;
    try {
      userResult = await withTimeout(supabase.auth.getUser(), SUPABASE_FALLBACK_TIMEOUT_MS);
    } catch (fallbackError) {
      if (isTransientNetworkError(fallbackError) || isTransientSessionError(fallbackError)) {
        return null;
      }
      throw fallbackError;
    }

    if (userResult.error) {
      if (isTransientNetworkError(userResult.error)) return null;
      throw normalizeSupabaseError(userResult.error);
    }

    const rawUser = userResult.data?.user || null;
    if (!rawUser?.id) return null;

    return {
      accessToken: null,
      decodedToken: { sub: rawUser.id, email: rawUser.email },
      email: normalizeEmailValue(rawUser.email) || null,
      sessionJti: null,
      source: 'session',
      userId: rawUser.id,
      user: rawUser,
    };
  } catch (error) {
    if (isTransientNetworkError(error) || isTransientSessionError(error)) return null;
    throw normalizeSupabaseError(error);
  }
}

export async function requireSessionRequest(
  request,
  { allowBearerFallback = true, requireRecentAuthMs = 0 } = {},
) {
  try {
    const sessionContext = await readSessionFromRequest(request, {
      allowBearer: allowBearerFallback,
    });

    if (!sessionContext) {
      throw new Error('Authentication session is required');
    }

    if (requireRecentAuthMs > 0) {
      const authTimeSeconds = Number(
        sessionContext.decodedToken?.auth_time || sessionContext.decodedToken?.iat || 0,
      );
      if (!Number.isFinite(authTimeSeconds) || authTimeSeconds <= 0) {
        throw new Error('Recent authentication is required');
      }
      const elapsedMs = Date.now() - authTimeSeconds * 1000;
      if (elapsedMs > Number(requireRecentAuthMs)) {
        throw new Error('Recent authentication is required');
      }
    }

    return sessionContext;
  } catch (error) {
    if (isTransientSessionError(error)) throw error;
    const msg = normalizeValue(error?.message).toLowerCase();
    if (
      msg.includes('invalid or expired authentication token') ||
      msg.includes('authentication token has been revoked')
    ) {
      throw new Error('Invalid or expired authentication token');
    }
    if (msg.includes('authentication session is required')) {
      throw new Error('Authentication session is required');
    }
    throw error;
  }
}

export async function requireAuthenticatedRequest(request, options = {}) {
  return requireSessionRequest(request, options);
}

export async function resolveOptionalSessionRequest(
  request,
  { allowBearerFallback = true, requireRecentAuthMs = 0, skipSupabaseFallback = true } = {},
) {
  try {
    const sessionContext = await readSessionFromRequest(request, {
      allowBearer: allowBearerFallback,
      skipSupabaseFallbackIfNoHint: true,
      skipSupabaseFallback,
    });

    if (!sessionContext) return null;
    if (requireRecentAuthMs > 0) {
      const authTimeSeconds = Number(
        sessionContext.decodedToken?.auth_time || sessionContext.decodedToken?.iat || 0,
      );
      if (!Number.isFinite(authTimeSeconds) || authTimeSeconds <= 0) return null;
      if (Date.now() - authTimeSeconds * 1000 > Number(requireRecentAuthMs)) return null;
    }

    return sessionContext;
  } catch {
    return null;
  }
}

// ============================================================
// Session Revocation & Control
// ============================================================

export async function isSessionRevoked({ decodedToken = {}, sessionJti = null, userId }) {
  const normalizedUserId = normalizeValue(userId);
  if (!normalizedUserId) return false;

  const admin = createAdminClient();
  const issuedAtSeconds = Number(decodedToken?.iat || 0);
  const p_iat =
    Number.isFinite(issuedAtSeconds) && issuedAtSeconds > 0
      ? new Date(issuedAtSeconds * 1000).toISOString()
      : null;

  const result = await admin.rpc('auth_is_session_revoked', {
    p_iat,
    p_session_jti: normalizeValue(sessionJti) || null,
    p_user_id: normalizedUserId,
  });

  if (result.error) {
    throw new Error(result.error.message || 'Session revocation check failed');
  }

  const data = result.data;
  if (typeof data === 'boolean') return data;
  if (Array.isArray(data) && data.length > 0) return Boolean(data[0]);
  if (data && typeof data === 'object') {
    if (typeof data.auth_is_session_revoked === 'boolean') return data.auth_is_session_revoked;
    for (const val of Object.values(data)) {
      if (typeof val === 'boolean') return val;
    }
  }
  return false;
}

export async function assertSessionNotRevoked(authContext = null) {
  if (!authContext?.userId) return authContext;

  const revoked = await isSessionRevoked({
    decodedToken: authContext.decodedToken,
    sessionJti: authContext.sessionJti,
    userId: authContext.userId,
  });

  if (!revoked) return authContext;

  const error = new Error('Authentication token has been revoked');
  error.code = 'AUTH_TOKEN_REVOKED';
  throw error;
}

export async function invokeSessionControl({ currentSessionJti = null, reason = null, userId }) {
  const normalizedUserId = normalizeValue(userId);
  if (!normalizedUserId) throw new Error('User ID is required');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase server admin environment is not configured');
  }

  const internalToken = normalizeValue(process.env.INFRA_INTERNAL_TOKEN);
  if (!internalToken) {
    throw new Error('INFRA_INTERNAL_TOKEN is required for session control');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/${SESSION_CONTROL_FUNCTION}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'x-infra-internal-token': internalToken,
    },
    body: JSON.stringify({
      currentSessionJti: normalizeValue(currentSessionJti) || null,
      reason: normalizeValue(reason) || null,
      userId: normalizedUserId,
    }),
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      normalizeValue(payload?.error) ||
        `Session control function failed with status ${response.status}`,
    );
  }

  if (normalizeValue(payload?.ok).toLowerCase() === 'false') {
    throw new Error('Session control function did not confirm success');
  }

  return payload;
}

// ============================================================
// Admin Auth User Management Facade Functions
// ============================================================

function normalizeIdentities(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function toFirebaseLikeUserRecord(user = null) {
  if (!user?.id) return null;
  const identities = normalizeIdentities(user?.identities);

  const providerData = resolveProviderDescriptors({
    identities,
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
    email: normalizeEmailValue(user?.email) || null,
    emailVerified: user?.email_confirmed_at != null || user?.confirmed_at != null || false,
    metadata: {
      creationTime: user?.created_at || null,
      lastSignInTime: user?.last_sign_in_at || null,
    },
    photoURL:
      user?.user_metadata?.avatar_url ||
      user?.user_metadata?.picture ||
      user?.user_metadata?.avatar ||
      null,
    identityCount: identities.length,
    providerData,
    uid: normalizeValue(user?.id),
    user_metadata: user?.user_metadata || {},
  };
}

export async function getUserByEmail(email) {
  const normalizedEmail = normalizeEmailValue(email);
  if (!normalizedEmail) throw new Error('Email is required');

  const admin = createAdminClient();
  const result = await admin
    .rpc('auth_get_user_by_email', { p_email: normalizedEmail })
    .maybeSingle();

  if (result.error) throw new Error(result.error.message || 'User lookup failed');
  if (!result.data) {
    const error = new Error('User not found');
    error.code = 'auth/user-not-found';
    throw error;
  }

  return toFirebaseLikeUserRecord(result.data);
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getUserById(userId) {
  const normalizedUserId = normalizeValue(userId);
  if (!normalizedUserId || !UUID_REGEX.test(normalizedUserId)) {
    throw new Error('Valid User ID UUID is required');
  }

  const admin = createAdminClient();
  const result = await admin.auth.admin.getUserById(normalizedUserId);

  if (result.error) throw new Error(result.error.message || 'User could not be loaded');
  return toFirebaseLikeUserRecord(result.data?.user || null);
}

export async function createUser(payload = {}) {
  const admin = createAdminClient();
  const result = await admin.auth.admin.createUser({
    app_metadata: payload.appMetadata || {},
    email: normalizeEmailValue(payload.email),
    email_confirm: Boolean(payload.emailVerified),
    password: payload.password !== undefined ? String(payload.password || '') : undefined,
    user_metadata: payload.userMetadata || {},
  });

  if (result.error) throw new Error(result.error.message || 'User could not be created');
  return toFirebaseLikeUserRecord(result.data?.user || null);
}

export async function updateUser(userId, payload = {}) {
  const normalizedUserId = normalizeValue(userId);
  if (!normalizedUserId || !UUID_REGEX.test(normalizedUserId)) {
    throw new Error('Valid User ID UUID is required');
  }

  const admin = createAdminClient();
  const updatePayload = {};

  if (payload.email !== undefined) updatePayload.email = normalizeEmailValue(payload.email);
  if (payload.emailVerified !== undefined)
    updatePayload.email_confirm = Boolean(payload.emailVerified);
  if (payload.password !== undefined) updatePayload.password = String(payload.password || '');
  if (payload.appMetadata !== undefined) updatePayload.app_metadata = payload.appMetadata || {};
  if (payload.userMetadata !== undefined) updatePayload.user_metadata = payload.userMetadata || {};

  const result = await admin.auth.admin.updateUserById(normalizedUserId, updatePayload);
  if (result.error) throw new Error(result.error.message || 'User could not be updated');

  return toFirebaseLikeUserRecord(result.data?.user || null);
}

export async function deleteUser(userId) {
  const normalizedUserId = normalizeValue(userId);
  if (!normalizedUserId || !UUID_REGEX.test(normalizedUserId)) {
    throw new Error('Valid User ID UUID is required');
  }

  const admin = createAdminClient();
  const result = await admin.auth.admin.deleteUser(normalizedUserId);

  if (result.error) throw new Error(result.error.message || 'User could not be deleted');
  return true;
}

export async function revokeRefreshTokens(
  userId,
  { currentSessionJti = null, reason = null } = {},
) {
  const normalizedUserId = normalizeValue(userId);
  if (!normalizedUserId) throw new Error('User ID is required');

  await invokeSessionControl({
    currentSessionJti,
    reason: reason || 'credential-change',
    userId: normalizedUserId,
  });

  return true;
}

export function createAdminAuthFacade(options = {}) {
  const defaults = {
    currentSessionJti: normalizeValue(options.currentSessionJti) || null,
    reason: normalizeValue(options.reason) || null,
  };

  return {
    createUser,
    deleteUser,
    getUser: getUserById,
    getUserByEmail,
    revokeRefreshTokens(userId, overrideOptions = {}) {
      return revokeRefreshTokens(userId, {
        currentSessionJti:
          normalizeValue(overrideOptions.currentSessionJti) || defaults.currentSessionJti,
        reason: normalizeValue(overrideOptions.reason) || defaults.reason,
      });
    },
    updateUser,
  };
}
