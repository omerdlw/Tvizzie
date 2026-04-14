import 'server-only';

import { cookies } from 'next/headers';

import { requireSessionRequest } from '@/core/auth/servers/session/authenticated-request.server';
import { readSessionFromRequest } from '@/core/auth/servers/session/session.server';
import { ADMIN_CONFIG } from './config.server';

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeLowerValue(value) {
  return normalizeValue(value).toLowerCase();
}

function uniqueLower(values = []) {
  return [...new Set(values.map((value) => normalizeLowerValue(value)).filter(Boolean))];
}

function toArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === null || value === undefined || value === '') {
    return [];
  }

  return [value];
}

function createAccessError({
  code = 'ADMIN_FORBIDDEN',
  message = 'Admin access is required',
  source = 'admin',
  status = 403,
} = {}) {
  const error = new Error(message);
  error.code = code;
  error.source = source;
  error.status = status;
  return error;
}

function resolveContextRoles(authContext = null) {
  const tokenRoleClaims = uniqueLower([
    ...toArray(authContext?.decodedToken?.role),
    ...toArray(authContext?.decodedToken?.roles),
    ...toArray(authContext?.decodedToken?.app_metadata?.role),
    ...toArray(authContext?.decodedToken?.app_metadata?.roles),
  ]);

  const sessionRoleClaims = uniqueLower(authContext?.session?.user?.roles || []);

  return uniqueLower([...sessionRoleClaims, ...tokenRoleClaims]);
}

function buildCookieRequest(cookieStore) {
  return {
    cookies: {
      get(name) {
        return cookieStore.get(name);
      },
    },
    headers: {
      get(name) {
        if (normalizeLowerValue(name) !== 'cookie') {
          return '';
        }

        return cookieStore
          .getAll()
          .map((cookie) => `${cookie.name}=${cookie.value}`)
          .join('; ');
      },
    },
  };
}

export function resolveAdminAccessContext(authContext = null) {
  const userId = normalizeLowerValue(authContext?.userId);
  const roles = resolveContextRoles(authContext);
  const isAllowedByAllowlist = Boolean(userId) && ADMIN_CONFIG.allowlistUserIds.has(userId);
  const isAllowedByRole = roles.includes(ADMIN_CONFIG.requiredRole);
  const isTransitionMode = ADMIN_CONFIG.allowlistTransition && isAllowedByAllowlist && !isAllowedByRole;
  const isAllowed = isAllowedByAllowlist && (isAllowedByRole || isTransitionMode);
  const mode = isAllowedByRole ? 'strict' : isTransitionMode ? 'allowlist_transition' : 'denied';

  return {
    isAllowed,
    isAllowedByAllowlist,
    isAllowedByRole,
    mode,
    requiredRole: ADMIN_CONFIG.requiredRole,
    roles,
    userId,
  };
}

export function assertAdminAccessFromContext(authContext = null, { source = 'admin' } = {}) {
  if (!authContext?.userId) {
    throw createAccessError({
      code: 'ADMIN_UNAUTHORIZED',
      message: 'Authentication session is required',
      source,
      status: 401,
    });
  }

  const accessContext = resolveAdminAccessContext(authContext);

  if (!accessContext.isAllowed) {
    throw createAccessError({
      code: 'ADMIN_FORBIDDEN',
      message: 'Admin access is not granted for this account',
      source,
      status: 403,
    });
  }

  return accessContext;
}

export async function assertAdminAccessForRequest(request, { source = 'admin' } = {}) {
  const authContext = await requireSessionRequest(request, {
    allowBearerFallback: true,
  });

  const accessContext = assertAdminAccessFromContext(authContext, { source });

  return {
    accessContext,
    authContext,
  };
}

export async function assertAdminAccessFromCookies({ source = 'admin' } = {}) {
  const cookieStore = await cookies();
  const request = buildCookieRequest(cookieStore);
  const authContext = await readSessionFromRequest(request, {
    allowBearer: false,
    skipSupabaseFallbackIfNoHint: false,
    skipSupabaseFallback: false,
  });

  if (!authContext) {
    throw createAccessError({
      code: 'ADMIN_UNAUTHORIZED',
      message: 'Authentication session is required',
      source,
      status: 401,
    });
  }

  return assertAdminAccessFromContext(authContext, { source });
}
