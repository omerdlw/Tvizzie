import { SUPABASE_URL } from './constants';

const SUPABASE_COOKIE_CHUNK_SUFFIX_PATTERN = /^(.*)\.(\d+)$/;
const SUPABASE_AUTH_TOKEN_SUFFIX = '-auth-token';
const SUPABASE_STORAGE_PREFIX = 'sb-';
const SUPABASE_BASE64_PREFIX = 'base64-';

export function normalizeStorageValue(value) {
  return String(value || '').trim();
}

export function resolveSupabaseProjectRef() {
  try {
    const hostname = new URL(SUPABASE_URL).hostname;
    return normalizeStorageValue(hostname.split('.')[0] || '');
  } catch {
    return '';
  }
}

export function listSupabaseAuthStorageKeys() {
  const projectRef = resolveSupabaseProjectRef();

  if (!projectRef) {
    return [];
  }

  const base = `${SUPABASE_STORAGE_PREFIX}${projectRef}${SUPABASE_AUTH_TOKEN_SUFFIX}`;

  return [base, `${base}-code-verifier`, `${base}-user`];
}

export function isSupabaseProjectStorageKey(key) {
  const normalizedKey = normalizeStorageValue(key);
  const projectRef = resolveSupabaseProjectRef();

  return Boolean(
    normalizedKey &&
    normalizedKey.startsWith(SUPABASE_STORAGE_PREFIX) &&
    (!projectRef || normalizedKey.startsWith(`${SUPABASE_STORAGE_PREFIX}${projectRef}-`))
  );
}

export function isSupabaseAuthCookieName(name) {
  const baseName = getCookieChunkBaseName(name);

  return baseName.startsWith(SUPABASE_STORAGE_PREFIX) && baseName.includes(SUPABASE_AUTH_TOKEN_SUFFIX);
}

export function getCookieChunkBaseName(cookieName) {
  const normalizedName = normalizeStorageValue(cookieName);
  const match = normalizedName.match(SUPABASE_COOKIE_CHUNK_SUFFIX_PATTERN);

  if (!match?.[1]) {
    return normalizedName;
  }

  return normalizeStorageValue(match[1]);
}

export function combineCookieChunks(cookieMap, cookieName) {
  const directValue = normalizeStorageValue(cookieMap.get(cookieName));

  if (directValue) {
    return directValue;
  }

  const chunks = [];

  for (let index = 0; index < 64; index += 1) {
    const chunkValue = normalizeStorageValue(cookieMap.get(`${cookieName}.${index}`));

    if (!chunkValue) {
      break;
    }

    chunks.push(chunkValue);
  }

  return chunks.length > 0 ? chunks.join('') : '';
}

export function decodeBase64UrlToString(value) {
  const normalizedValue = normalizeStorageValue(value);

  if (!normalizedValue) {
    return '';
  }

  const base64 = normalizedValue.replace(/-/g, '+').replace(/_/g, '/');
  const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');

  try {
    const binary = atob(paddedBase64);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return '';
  }
}

function decodeSupabaseCookiePayload(value) {
  const normalizedValue = normalizeStorageValue(value);

  if (!normalizedValue) {
    return '';
  }

  if (!normalizedValue.startsWith(SUPABASE_BASE64_PREFIX)) {
    return normalizedValue;
  }

  const encodedValue = normalizeStorageValue(normalizedValue.slice(SUPABASE_BASE64_PREFIX.length));

  return encodedValue ? decodeBase64UrlToString(encodedValue) : '';
}

export function parseSupabaseSessionAccessToken(cookieValue) {
  const decodedPayload = decodeSupabaseCookiePayload(cookieValue);

  if (!decodedPayload) {
    return '';
  }

  let parsedPayload;

  try {
    parsedPayload = JSON.parse(decodedPayload);
  } catch {
    return '';
  }

  if (Array.isArray(parsedPayload)) {
    return normalizeStorageValue(parsedPayload[0]);
  }

  if (!parsedPayload || typeof parsedPayload !== 'object') {
    return '';
  }

  return normalizeStorageValue(
    parsedPayload?.access_token || parsedPayload?.session?.access_token || parsedPayload?.currentSession?.access_token
  );
}
