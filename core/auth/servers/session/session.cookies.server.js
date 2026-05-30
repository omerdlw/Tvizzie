import 'server-only';

import { uniqueStrings } from '@/core/auth/capabilities';
import { SUPABASE_URL } from '@/core/clients/supabase/constants';
import { COOKIE_CHUNK_SUFFIX_PATTERN, SUPABASE_BASE64_PREFIX } from './session.constants';
import { decodeJwtPayload, normalizeValue } from './session.shared';

function getAuthorizationHeader(request) {
  return normalizeValue(request?.headers?.get?.('authorization'));
}

export function getBearerToken(request) {
  const header = getAuthorizationHeader(request);

  if (!header.toLowerCase().startsWith('bearer ')) {
    return '';
  }

  return normalizeValue(header.slice(7));
}

export function getCookieHeaderValue(request) {
  return normalizeValue(request?.headers?.get?.('cookie'));
}

function parseCookieHeader(cookieHeader) {
  if (!cookieHeader) {
    return [];
  }

  return cookieHeader
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const separatorIndex = item.indexOf('=');

      if (separatorIndex < 0) {
        return null;
      }

      return {
        name: item.slice(0, separatorIndex),
        value: item.slice(separatorIndex + 1),
      };
    })
    .filter(Boolean);
}

export function getRequestCookies(request) {
  const cookieStoreValues = request?.cookies?.getAll?.();

  if (Array.isArray(cookieStoreValues) && cookieStoreValues.length > 0) {
    return cookieStoreValues
      .map((cookie) => ({
        name: normalizeValue(cookie?.name),
        value: normalizeValue(cookie?.value),
      }))
      .filter((cookie) => cookie.name);
  }

  return parseCookieHeader(getCookieHeaderValue(request));
}

function getCookieChunkBaseName(cookieName) {
  const normalizedName = normalizeValue(cookieName);
  const match = normalizedName.match(COOKIE_CHUNK_SUFFIX_PATTERN);

  if (!match?.[1]) {
    return normalizedName;
  }

  return normalizeValue(match[1]);
}

function combineCookieChunks(cookieMap, cookieName) {
  const directValue = normalizeValue(cookieMap.get(cookieName));

  if (directValue) {
    return directValue;
  }

  const chunks = [];

  for (let index = 0; index < 64; index += 1) {
    const chunkValue = normalizeValue(cookieMap.get(`${cookieName}.${index}`));

    if (!chunkValue) {
      break;
    }

    chunks.push(chunkValue);
  }

  return chunks.length > 0 ? chunks.join('') : '';
}

function decodeSupabaseCookiePayload(value) {
  const normalizedValue = normalizeValue(value);

  if (!normalizedValue) {
    return '';
  }

  if (!normalizedValue.startsWith(SUPABASE_BASE64_PREFIX)) {
    return normalizedValue;
  }

  const encodedValue = normalizeValue(normalizedValue.slice(SUPABASE_BASE64_PREFIX.length));

  if (!encodedValue) {
    return '';
  }

  try {
    return Buffer.from(encodedValue, 'base64url').toString('utf8');
  } catch {
    return '';
  }
}

function parseSupabaseSessionCookie(cookieValue) {
  const decodedPayload = decodeSupabaseCookiePayload(cookieValue);

  if (!decodedPayload) {
    return null;
  }

  let parsedPayload;

  try {
    parsedPayload = JSON.parse(decodedPayload);
  } catch {
    return null;
  }

  if (Array.isArray(parsedPayload)) {
    const accessToken = normalizeValue(parsedPayload[0]);

    if (!accessToken) {
      return null;
    }

    return {
      accessToken,
      user: null,
    };
  }

  if (!parsedPayload || typeof parsedPayload !== 'object') {
    return null;
  }

  const accessToken = normalizeValue(
    parsedPayload?.access_token || parsedPayload?.session?.access_token || parsedPayload?.currentSession?.access_token
  );

  if (!accessToken) {
    return null;
  }

  return {
    accessToken,
    user: parsedPayload?.user || parsedPayload?.session?.user || parsedPayload?.currentSession?.user || null,
  };
}

function resolveSupabaseProjectRef() {
  try {
    const hostname = new URL(SUPABASE_URL).hostname;
    return hostname.split('.')[0] || '';
  } catch {
    return '';
  }
}

export function listSupabaseAuthCookieNames(request = null) {
  const projectRef = resolveSupabaseProjectRef();

  const cookieNamesFromRequest = getRequestCookies(request)
    .map((cookie) => normalizeValue(cookie?.name))
    .filter(Boolean);

  const defaultNames = [];

  if (projectRef) {
    const base = `sb-${projectRef}-auth-token`;
    const chunkNames = Array.from({ length: 31 }, (_, index) => `${base}.${index}`);

    defaultNames.push(base, ...chunkNames, `${base}-code-verifier`);
  }

  const dynamicNames = cookieNamesFromRequest.filter((cookieName) => {
    const normalizedName = normalizeValue(cookieName);

    if (!normalizedName.startsWith('sb-')) {
      return false;
    }

    if (normalizedName.includes('-auth-token')) {
      return true;
    }

    if (!projectRef) {
      return false;
    }

    return normalizedName.startsWith(`sb-${projectRef}-auth-token`) || normalizedName.startsWith(`sb-${projectRef}-`);
  });

  return uniqueStrings([
    ...defaultNames,
    ...dynamicNames,
    'supabase-auth-token',
    'sb-access-token',
    'sb-refresh-token',
  ]);
}

export function readSessionFromSupabaseCookies(request) {
  const requestCookies = getRequestCookies(request);

  if (!Array.isArray(requestCookies) || requestCookies.length === 0) {
    return null;
  }

  const cookieMap = new Map();

  requestCookies.forEach((cookie) => {
    const cookieName = normalizeValue(cookie?.name);

    if (!cookieName) {
      return;
    }

    cookieMap.set(cookieName, normalizeValue(cookie?.value));
  });

  const candidateCookieNames = new Set();

  listSupabaseAuthCookieNames(request).forEach((cookieName) => {
    const baseName = getCookieChunkBaseName(cookieName);

    if (baseName) {
      candidateCookieNames.add(baseName);
    }
  });

  requestCookies.forEach((cookie) => {
    const baseName = getCookieChunkBaseName(cookie?.name);

    if (baseName && baseName.startsWith('sb-') && baseName.includes('auth-token')) {
      candidateCookieNames.add(baseName);
    }
  });

  for (const cookieName of candidateCookieNames) {
    const cookieValue = combineCookieChunks(cookieMap, cookieName);
    const sessionSnapshot = parseSupabaseSessionCookie(cookieValue);

    if (!sessionSnapshot?.accessToken) {
      continue;
    }

    const decodedToken = decodeJwtPayload(sessionSnapshot.accessToken);
    const expiresAt = Number(decodedToken?.exp || 0);

    if (expiresAt * 1000 <= Date.now() + 60000) {
      continue;
    }

    return sessionSnapshot;
  }

  return null;
}

export function hasSessionCookieHint(request) {
  const cookies = getRequestCookies(request);

  if (!Array.isArray(cookies) || cookies.length === 0) {
    return false;
  }

  for (const cookie of cookies) {
    const cookieName = getCookieChunkBaseName(cookie?.name);

    if (!cookieName) {
      continue;
    }

    if (
      cookieName === 'tvz_session' ||
      cookieName === 'supabase-auth-token' ||
      cookieName === 'sb-access-token' ||
      cookieName === 'sb-refresh-token'
    ) {
      return true;
    }

    if (cookieName.startsWith('sb-') && cookieName.includes('auth-token')) {
      return true;
    }
  }

  return false;
}

export function hasSessionHint(request, { allowBearer = true } = {}) {
  if (allowBearer && getBearerToken(request)) {
    return true;
  }

  return hasSessionCookieHint(request);
}
