import {
  SUPABASE_FALLBACK_TIMEOUT_MS,
  AUTH_COOKIE_PATH,
  CSRF_COOKIE_NAME,
  STEP_UP_COOKIE_NAME,
  STEP_UP_MAX_AGE_MS,
  STEP_UP_MAX_AGE_SECONDS,
} from './session.constants';
import {
  getBearerToken,
  hasSessionHint,
  readSessionFromSupabaseCookies,
} from './session.cookies.server';
import {
  applySessionCookies,
  clearAuthCookies,
  clearCsrfCookie,
  createCsrfToken,
  getCookieValue,
  isSecureCookieEnvironment,
  setCsrfCookie,
} from './session-cookie-state.server';
import {
  isTransientNetworkError,
  isTransientSessionError,
  normalizeSupabaseError,
  withTimeout,
} from './session-errors.server';
import { createRequestSupabaseClient } from './session-request-client.server';
import { buildAuthContextFromAccessToken, createSessionFromIdToken } from './session-auth-context.server';
import {
  buildNormalizedSession,
  buildSessionUser,
  serializeSessionState,
} from './session.builder';
import { normalizeValue } from './session.shared';

export { AUTH_COOKIE_PATH, CSRF_COOKIE_NAME, STEP_UP_COOKIE_NAME, STEP_UP_MAX_AGE_MS, STEP_UP_MAX_AGE_SECONDS };
export { applySessionCookies, clearAuthCookies, clearCsrfCookie, createCsrfToken, getCookieValue, isSecureCookieEnvironment, setCsrfCookie };
export { buildNormalizedSession, buildSessionUser, serializeSessionState } from './session.builder';
export { createSessionFromIdToken };
export { isTransientSessionError };

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
