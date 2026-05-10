import { randomBytes } from 'crypto';

import { createServerClient } from '@supabase/ssr';

import { createAdminAuthFacade } from '@/core/auth/servers/session/supabase-admin-auth.server';
import { assertSessionNotRevoked } from '@/core/auth/servers/session/revocation.server';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, assertSupabaseBrowserEnv } from '@/core/clients/supabase/constants';
import { assertGoogleSessionConsistency } from '@/core/auth/servers/providers/google-provider.server';
import {
  AUTH_COOKIE_PATH,
  CSRF_COOKIE_NAME,
  LEGACY_CSRF_COOKIE_NAME,
  STEP_UP_COOKIE_NAME,
  STEP_UP_MAX_AGE_MS,
  STEP_UP_MAX_AGE_SECONDS,
  SUPABASE_FALLBACK_TIMEOUT_MS,
} from './session.constants';
import {
  getBearerToken,
  getCookieHeaderValue,
  getRequestCookies,
  hasSessionHint,
  listSupabaseAuthCookieNames,
  readSessionFromSupabaseCookies,
} from './session.cookies.server';
import {
  buildNormalizedSession,
  buildSessionUser,
  serializeSessionState,
  toFirebaseLikeUserRecord,
} from './session.builder';
import { decodeJwtPayload, normalizeValue, toLowercase } from './session.shared';

export { AUTH_COOKIE_PATH, CSRF_COOKIE_NAME, STEP_UP_COOKIE_NAME, STEP_UP_MAX_AGE_MS, STEP_UP_MAX_AGE_SECONDS };
export { buildNormalizedSession, buildSessionUser, serializeSessionState } from './session.builder';

function createRequestSupabaseClient(request) {
  assertSupabaseBrowserEnv();

  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return getRequestCookies(request);
      },
      setAll() {
        // Route handlers manage cookie writes explicitly on response objects.
      },
    },
  });
}

function normalizeSupabaseError(error) {
  const message = toLowercase(error?.message);

  if (
    message.includes('jwt') &&
    (message.includes('expired') ||
      message.includes('invalid') ||
      message.includes('malformed') ||
      message.includes('not found'))
  ) {
    return new Error('Invalid or expired authentication token');
  }

  if (message.includes('session') && (message.includes('missing') || message.includes('not found'))) {
    return new Error('Authentication session is required');
  }

  return error;
}

export function getCookieValue(request, cookieName) {
  const directValue = request?.cookies?.get?.(cookieName)?.value;

  if (directValue) {
    return normalizeValue(directValue);
  }

  const cookieHeader = getCookieHeaderValue(request);

  if (!cookieHeader) {
    return '';
  }

  const prefix = `${cookieName}=`;

  for (const item of cookieHeader.split(';')) {
    const normalizedItem = normalizeValue(item);

    if (normalizedItem.startsWith(prefix)) {
      return normalizeValue(decodeURIComponent(normalizedItem.slice(prefix.length)));
    }
  }

  return '';
}

export function isSecureCookieEnvironment() {
  return process.env.NODE_ENV === 'production';
}

function createCookieOptions({ httpOnly = true, maxAge, sameSite = 'lax' }) {
  return {
    httpOnly,
    maxAge,
    path: AUTH_COOKIE_PATH,
    sameSite,
    secure: isSecureCookieEnvironment(),
  };
}

export function setCsrfCookie(response, csrfToken) {
  response.cookies.set(
    CSRF_COOKIE_NAME,
    csrfToken,
    createCookieOptions({
      httpOnly: false,
      maxAge: 12 * 60 * 60,
      sameSite: 'lax',
    })
  );
}

export function clearCsrfCookie(response) {
  response.cookies.set(
    CSRF_COOKIE_NAME,
    '',
    createCookieOptions({
      httpOnly: false,
      maxAge: 0,
      sameSite: 'lax',
    })
  );

  response.cookies.set(
    LEGACY_CSRF_COOKIE_NAME,
    '',
    createCookieOptions({
      httpOnly: false,
      maxAge: 0,
      sameSite: 'lax',
    })
  );
}

export function applySessionCookies(response, { csrfToken } = {}) {
  if (normalizeValue(csrfToken)) {
    setCsrfCookie(response, csrfToken);
  }
}

function expireCookie(response, cookieName, { httpOnly = true } = {}) {
  response.cookies.delete(cookieName);
  response.cookies.set(cookieName, '', {
    httpOnly,
    maxAge: 0,
    expires: new Date(0),
    path: AUTH_COOKIE_PATH,
    sameSite: 'lax',
    secure: isSecureCookieEnvironment(),
  });
}

export function clearAuthCookies(response, request = null) {
  clearCsrfCookie(response);
  expireCookie(response, 'tvz_session', { httpOnly: true });

  for (const cookieName of listSupabaseAuthCookieNames(request)) {
    expireCookie(response, cookieName, { httpOnly: true });
    expireCookie(response, cookieName, { httpOnly: false });
  }
}

export function createCsrfToken() {
  return randomBytes(32).toString('base64url');
}

async function buildAuthContextFromAccessToken(accessToken, authMethod = 'session', predefinedUser = null) {
  const normalizedAccessToken = normalizeValue(accessToken);

  if (!normalizedAccessToken) {
    throw new Error('Authentication session is required');
  }

  const decodedToken = decodeJwtPayload(normalizedAccessToken);
  let rawUser = predefinedUser;

  // Fallback to JWT payload if no user is provided. This safely extracts user ID and email
  // without hitting the DB, relying on the fact that Next.js middleware or session verification
  // has already validated the JWT signature (via getSession or auth guards).
  if (!rawUser) {
    if (!decodedToken?.sub) {
      throw new Error('Invalid or expired authentication token');
    }
    rawUser = {
      id: decodedToken.sub,
      email: decodedToken.email,
      app_metadata: decodedToken.app_metadata || {},
      user_metadata: decodedToken.user_metadata || {},
    };
  }

  const userRecord = toFirebaseLikeUserRecord(rawUser);
  const userId = normalizeValue(userRecord?.uid || rawUser?.id);
  const email = toLowercase(userRecord?.email || rawUser?.email);

  if (!userId) {
    throw new Error('Invalid or expired authentication token');
  }

  if (!email) {
    throw new Error('Authenticated user does not have an email address');
  }

  await assertGoogleSessionConsistency({
    accessToken: normalizedAccessToken,
    decodedToken,
    rawUser,
    userRecord,
  });

  const sessionJti = normalizeValue(decodedToken?.session_id || decodedToken?.jti || decodedToken?.sub) || null;
  const authContext = {
    accessToken: normalizedAccessToken,
    adminAuth: createAdminAuthFacade({
      currentSessionJti: sessionJti,
      reason: 'session-context',
    }),
    authMethod,
    decodedToken,
    email,
    session: buildNormalizedSession(decodedToken, userRecord),
    sessionCookie: null,
    sessionJti,
    userId,
    userRecord,
  };

  await assertSessionNotRevoked(authContext);
  return authContext;
}

export async function createSessionFromIdToken(idToken) {
  const normalizedIdToken = normalizeValue(idToken);

  if (!normalizedIdToken) {
    throw new Error('idToken is required');
  }

  const context = await buildAuthContextFromAccessToken(normalizedIdToken, 'bearer');

  return {
    ...context,
    csrfToken: createCsrfToken(),
  };
}

function isTransientNetworkError(error) {
  const message = toLowercase(error?.message);
  const cause = toLowercase(error?.cause?.message || error?.cause?.code);

  return (
    message.includes('fetch failed') ||
    message.includes('connect timeout') ||
    message.includes('econnrefused') ||
    message.includes('enotfound') ||
    message.includes('network request failed') ||
    cause.includes('connect timeout') ||
    cause.includes('und_err_connect_timeout')
  );
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Supabase session fetch timed out'));
    }, ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export function isTransientSessionError(error) {
  const message = toLowercase(error?.message);

  return isTransientNetworkError(error) || message.includes('supabase session fetch timed out');
}

export async function readSessionFromRequest(
  request,
  { allowBearer = true, skipSupabaseFallbackIfNoHint = true, skipSupabaseFallback = false } = {}
) {
  try {
    const bearerToken = allowBearer ? getBearerToken(request) : '';

    if (bearerToken) {
      return buildAuthContextFromAccessToken(bearerToken, 'bearer');
    }

    const cookieSession = readSessionFromSupabaseCookies(request);

    if (cookieSession?.accessToken) {
      return buildAuthContextFromAccessToken(cookieSession.accessToken, 'session', cookieSession.user || null);
    }

    if (skipSupabaseFallback) {
      return null;
    }

    if (skipSupabaseFallbackIfNoHint && !hasSessionHint(request, { allowBearer })) {
      return null;
    }

    const supabase = createRequestSupabaseClient(request);

    let sessionResult;
    try {
      sessionResult = await withTimeout(supabase.auth.getSession(), SUPABASE_FALLBACK_TIMEOUT_MS);
    } catch (fallbackError) {
      if (isTransientNetworkError(fallbackError) || isTransientSessionError(fallbackError)) {
        return null;
      }
      throw fallbackError;
    }

    if (sessionResult.error) {
      if (isTransientNetworkError(sessionResult.error)) {
        return null;
      }
      throw normalizeSupabaseError(sessionResult.error);
    }

    const resultToken = normalizeValue(sessionResult.data?.session?.access_token);

    if (!resultToken) {
      return null;
    }

    return buildAuthContextFromAccessToken(resultToken, 'session', sessionResult.data?.session?.user || null);
  } catch (error) {
    if (isTransientNetworkError(error) || isTransientSessionError(error)) {
      return null;
    }
    throw normalizeSupabaseError(error);
  }
}
