import { readSessionFromRequest, isTransientSessionError } from '@/core/auth/servers/session/session.server';

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeAuthError(error) {
  const message = normalizeValue(error?.message).toLowerCase();

  if (
    message.includes('invalid or expired authentication token') ||
    message.includes('authentication token has been revoked')
  ) {
    return new Error('Invalid or expired authentication token');
  }

  if (message.includes('authentication session is required')) {
    return new Error('Authentication session is required');
  }

  return error;
}

function assertRecentAuthentication(decodedToken, requireRecentAuthMs) {
  if (requireRecentAuthMs <= 0) {
    return;
  }

  const authTimeSeconds = Number(decodedToken?.auth_time || decodedToken?.iat || 0);

  if (!Number.isFinite(authTimeSeconds) || authTimeSeconds <= 0) {
    throw new Error('Recent authentication is required');
  }

  const elapsedMs = Date.now() - authTimeSeconds * 1000;

  if (elapsedMs > Number(requireRecentAuthMs)) {
    throw new Error('Recent authentication is required');
  }
}

export async function requireSessionRequest(request, { allowBearerFallback = true, requireRecentAuthMs = 0 } = {}) {
  try {
    const sessionContext = await readSessionFromRequest(request, {
      allowBearer: allowBearerFallback,
    });

    if (!sessionContext) {
      throw new Error('Authentication session is required');
    }

    assertRecentAuthentication(sessionContext.decodedToken, requireRecentAuthMs);

    return sessionContext;
  } catch (error) {
    if (isTransientSessionError(error)) {
      throw error;
    }
    throw normalizeAuthError(error);
  }
}

export async function requireAuthenticatedRequest(request, options = {}) {
  return requireSessionRequest(request, options);
}

export async function resolveOptionalSessionRequest(
  request,
  { allowBearerFallback = true, requireRecentAuthMs = 0, skipSupabaseFallback = true } = {}
) {
  try {
    const sessionContext = await readSessionFromRequest(request, {
      allowBearer: allowBearerFallback,
      skipSupabaseFallbackIfNoHint: true,
      skipSupabaseFallback,
    });

    if (!sessionContext) {
      return null;
    }

    assertRecentAuthentication(sessionContext.decodedToken, requireRecentAuthMs);
    return sessionContext;
  } catch (error) {
    if (isTransientSessionError(error)) {
      return null;
    }

    return null;
  }
}
