import 'server-only';
import { createHash } from 'crypto';
import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { normalizeEmailValue, normalizeValue } from '@/domains/shell/shared/utils.js';
import { createAdminClient } from '@/infrastructure/supabase/admin';
import {
  combineCookieChunks,
  getCookieChunkBaseName,
  isSupabaseAuthCookieName,
  parseSupabaseSessionAccessToken,
} from '@/infrastructure/supabase/auth-storage';
import {
  assertSupabaseBrowserEnv,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from '@/infrastructure/supabase/supabase-constants';
import {
  SUPABASE_FALLBACK_TIMEOUT_MS,
} from '@/domains/auth/utils/constants';
import { randomBytes } from 'crypto';
import { createSupabaseResponseClient } from '@/infrastructure/supabase/response-client.server';
import {
  listSupabaseAuthStorageKeys,
  listSupabaseRequestStorageKeys,
} from '@/infrastructure/supabase/auth-storage';
import {
  AUTH_COOKIE_PATH,
  CSRF_COOKIE_NAME,
  LEGACY_CSRF_COOKIE_NAME,
  STEP_UP_COOKIE_NAME,
  STEP_UP_MAX_AGE_MS,
  STEP_UP_MAX_AGE_SECONDS,
} from '@/domains/auth/utils/constants';

export {
  AUTH_COOKIE_PATH,
  CSRF_COOKIE_NAME,
  STEP_UP_COOKIE_NAME,
  STEP_UP_MAX_AGE_MS,
  STEP_UP_MAX_AGE_SECONDS,
};

export {
  createAdminAuthFacade,
  createUser,
  deleteUser,
  getUserByEmail,
  getUserById,
  invokeSessionControl,
  revokeRefreshTokens,
  updateUser,
} from './admin.server.js';

const DEVICE_ID_COOKIE_NAME = 'tvz_device_id';
const DEVICE_ID_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export function isSecureCookieEnvironment() {
  return process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false';
}

export function getCookieValue(request, cookieName) {
  const cookieHeader = normalizeValue(request?.headers?.get?.('cookie'));
  if (!cookieHeader) return '';

  const prefix = `${cookieName}=`;
  const cookie = cookieHeader
    .split(';')
    .map(normalizeValue)
    .find((entry) => entry.startsWith(prefix));

  if (!cookie) return '';

  try {
    return decodeURIComponent(cookie.slice(prefix.length));
  } catch {
    return '';
  }
}

export function createCsrfToken() {
  return randomBytes(32).toString('base64url');
}

function setCookie(response, name, value, options) {
  response.cookies.set(name, value, {
    path: AUTH_COOKIE_PATH,
    sameSite: 'lax',
    secure: isSecureCookieEnvironment(),
    ...options,
  });
}

export function setCsrfCookie(response, token) {
  const normalizedToken = normalizeValue(token);
  if (!normalizedToken) return;
  setCookie(response, CSRF_COOKIE_NAME, normalizedToken, { httpOnly: false, maxAge: 86400 });
}

export function clearCsrfCookie(response) {
  setCookie(response, CSRF_COOKIE_NAME, '', { httpOnly: false, maxAge: 0 });
}

function getRequestStorageCookieNames(request) {
  if (typeof request?.cookies?.getAll === 'function') {
    return listSupabaseRequestStorageKeys(request.cookies.getAll());
  }

  return listSupabaseRequestStorageKeys(
    normalizeValue(request?.headers?.get?.('cookie'))
      .split(';')
      .flatMap((entry) => {
        const separatorIndex = entry.indexOf('=');
        return separatorIndex > 0 ? [{ name: entry.slice(0, separatorIndex) }] : [];
      }),
  );
}

export function clearAuthCookies(response, request = null) {
  clearCsrfCookie(response);
  const names = new Set([
    LEGACY_CSRF_COOKIE_NAME,
    'sb-access-token',
    'sb-refresh-token',
    ...getRequestStorageCookieNames(request),
    ...listSupabaseAuthStorageKeys().flatMap((name) => [
      name,
      ...Array.from({ length: 64 }, (_, index) => `${name}.${index}`),
    ]),
  ]);

  names.forEach((name) => setCookie(response, name, '', { httpOnly: true, maxAge: 0 }));
}

export function setDeviceIdCookie(response, deviceId) {
  const normalizedDeviceId = normalizeValue(deviceId);
  if (!normalizedDeviceId) return;
  setCookie(response, DEVICE_ID_COOKIE_NAME, normalizedDeviceId, {
    httpOnly: true,
    maxAge: DEVICE_ID_MAX_AGE_SECONDS,
  });
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

export async function applySupabaseSessionToResponse(
  request,
  response,
  { accessToken, refreshToken },
) {
  const normalizedAccessToken = normalizeValue(accessToken);
  const normalizedRefreshToken = normalizeValue(refreshToken);
  if (!normalizedAccessToken || !normalizedRefreshToken) {
    throw new Error('A complete authentication session is required');
  }

  const result = await createSupabaseResponseClient(request, response).auth.setSession({
    access_token: normalizedAccessToken,
    refresh_token: normalizedRefreshToken,
  });

  if (result.error || !result.data?.session?.access_token) {
    throw new Error(result.error?.message || 'Authentication session could not be established');
  }

  return buildNormalizedSession(result.data.session, result.data.user || null);
}


function hashValue(value) {
  const normalized = normalizeValue(value);
  return normalized ? createHash('sha256').update(normalized).digest('hex') : null;
}

function getHeader(request, name) {
  return normalizeValue(request?.headers?.get?.(name));
}

function getIpAddress(request) {
  const forwardedFor = getHeader(request, 'x-forwarded-for');
  if (forwardedFor) return normalizeValue(forwardedFor.split(',')[0]);
  return getHeader(request, 'x-real-ip') || getHeader(request, 'cf-connecting-ip') || 'unknown';
}

function resolveDeviceId(request, ipAddress) {
  const explicitDeviceId = getCookieValue(request, DEVICE_ID_COOKIE_NAME);

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
  const legacyAccessToken = getCookieValue(request, 'sb-access-token');
  const legacyRefreshToken = getCookieValue(request, 'sb-refresh-token');

  if (legacyAccessToken) {
    return {
      accessToken: legacyAccessToken,
      refreshToken: legacyRefreshToken,
      source: 'legacy-session',
    };
  }

  const cookieMap = new Map();
  const sessionCookieNames = new Set();
  const requestCookies =
    typeof request?.cookies?.getAll === 'function'
      ? request.cookies.getAll()
      : String(getHeader(request, 'cookie') || '')
          .split(';')
          .flatMap((entry) => {
            const separatorIndex = entry.indexOf('=');
            if (separatorIndex <= 0) return [];

            const name = normalizeValue(entry.slice(0, separatorIndex));
            if (!name) return [];

            return [{ name, value: entry.slice(separatorIndex + 1).trim() }];
          });

  requestCookies.forEach(({ name, value }) => {
    const normalizedName = normalizeValue(name);
    if (!normalizedName) return;

    cookieMap.set(normalizedName, normalizeValue(value));
    const baseName = getCookieChunkBaseName(normalizedName);
    if (isSupabaseAuthCookieName(baseName)) sessionCookieNames.add(baseName);
  });

  for (const cookieName of sessionCookieNames) {
    const accessToken = parseSupabaseSessionAccessToken(combineCookieChunks(cookieMap, cookieName));
    if (accessToken) {
      return {
        accessToken,
        refreshToken: null,
        source: 'ssr-cookie-session',
      };
    }
  }

  return null;
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

const VERIFIED_TOKEN_CACHE = new Map();
const VERIFIED_TOKEN_CACHE_TTL_MS = 60 * 1000;

function getCachedVerifiedSession(token) {
  const entry = VERIFIED_TOKEN_CACHE.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    VERIFIED_TOKEN_CACHE.delete(token);
    return null;
  }
  return entry.context;
}

function setCachedVerifiedSession(token, context) {
  const expMs = Number(context.decodedToken?.exp) * 1000;
  const maxTtlMs =
    Number.isFinite(expMs) && expMs > Date.now()
      ? Math.min(Date.now() + VERIFIED_TOKEN_CACHE_TTL_MS, expMs)
      : Date.now() + VERIFIED_TOKEN_CACHE_TTL_MS;

  VERIFIED_TOKEN_CACHE.set(token, {
    context,
    expiresAt: maxTtlMs,
  });

  if (VERIFIED_TOKEN_CACHE.size > 500) {
    const firstKey = VERIFIED_TOKEN_CACHE.keys().next().value;
    VERIFIED_TOKEN_CACHE.delete(firstKey);
  }
}

let sharedAuthClient = null;

function getSharedAuthClient() {
  if (!sharedAuthClient) {
    assertSupabaseBrowserEnv();
    sharedAuthClient = createSupabaseClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
  }
  return sharedAuthClient;
}

async function verifyAccessTokenWithSupabase(token, source) {
  const normalizedToken = normalizeValue(token);
  if (!normalizedToken) return null;

  const cached = getCachedVerifiedSession(normalizedToken);
  if (cached) {
    return cached;
  }

  const client = getSharedAuthClient();
  const result = await withTimeout(
    client.auth.getUser(normalizedToken),
    SUPABASE_FALLBACK_TIMEOUT_MS,
  );

  if (result.error || !result.data?.user?.id) {
    throw new Error('Invalid or expired authentication token');
  }

  const context = buildAuthContextFromAccessToken(normalizedToken, source, result.data.user);
  if (context.userId !== result.data.user.id) {
    throw new Error('Invalid or expired authentication token');
  }

  const finalContext = {
    ...context,
    email: normalizeEmailValue(result.data.user.email) || context.email,
    user: result.data.user,
    userId: result.data.user.id,
  };

  setCachedVerifiedSession(normalizedToken, finalContext);

  return finalContext;
}

export function createSessionFromIdToken(idToken) {
  return buildAuthContextFromAccessToken(idToken, 'idToken');
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
      getAll: () => {
        if (typeof request?.cookies?.getAll === 'function') {
          return request.cookies.getAll();
        }

        const cookieHeader = getHeader(request, 'cookie');
        if (!cookieHeader) return [];

        return cookieHeader.split(';').flatMap((item) => {
          const separatorIndex = item.indexOf('=');
          if (separatorIndex <= 0) return [];

          const name = normalizeValue(item.slice(0, separatorIndex));
          const rawValue = item.slice(separatorIndex + 1).trim();
          if (!name) return [];

          let value = rawValue;
          try {
            value = decodeURIComponent(rawValue);
          } catch {}

          return [{ name, value }];
        });
      },
    },
  });
}

export function createAuthenticatedSupabaseClient(accessToken) {
  const normalizedAccessToken = normalizeValue(accessToken);

  if (!normalizedAccessToken) {
    throw new Error('Authentication session is required');
  }

  assertSupabaseBrowserEnv();
  return createSupabaseClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    accessToken: async () => normalizedAccessToken,
    global: {
      headers: {
        Authorization: `Bearer ${normalizedAccessToken}`,
      },
    },
  });
}

export async function readSessionFromRequest(
  request,
  { allowBearer = true, skipSupabaseFallbackIfNoHint = true, skipSupabaseFallback = false } = {},
) {
  try {
    const bearerToken = allowBearer ? getBearerToken(request) : '';
    if (bearerToken) {
      return await verifyAccessTokenWithSupabase(bearerToken, 'bearer');
    }

    const cookieSession = readSessionFromSupabaseCookies(request);
    if (cookieSession?.accessToken) {
      try {
        return await verifyAccessTokenWithSupabase(
          cookieSession.accessToken,
          cookieSession.source || 'cookie-session',
        );
      } catch (legacyCookieError) {
        if (
          isTransientNetworkError(legacyCookieError) ||
          isTransientSessionError(legacyCookieError)
        ) {
          throw legacyCookieError;
        }
      }
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
