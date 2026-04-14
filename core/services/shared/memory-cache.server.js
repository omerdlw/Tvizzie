import 'server-only';

const DEFAULT_TTL_MS = 2000;
const MAX_CACHE_ENTRIES = 400;
const responseCache = new Map();

function normalizeValue(value) {
  return String(value || '').trim();
}

function pruneCache() {
  if (responseCache.size <= MAX_CACHE_ENTRIES) {
    return;
  }

  const now = Date.now();

  for (const [key, entry] of responseCache.entries()) {
    if ((entry?.expiresAt || 0) <= now && !entry?.inFlightPromise) {
      responseCache.delete(key);
    }
  }

  if (responseCache.size <= MAX_CACHE_ENTRIES) {
    return;
  }

  const overflowCount = responseCache.size - MAX_CACHE_ENTRIES;
  const keys = Array.from(responseCache.keys());

  for (let index = 0; index < overflowCount; index += 1) {
    const key = keys[index];

    if (key) {
      responseCache.delete(key);
    }
  }
}

export function invalidateCachedValue(cacheKey) {
  const normalizedCacheKey = normalizeValue(cacheKey);

  if (!normalizedCacheKey) {
    return;
  }

  responseCache.delete(normalizedCacheKey);
}

export function invalidateCachedValuesByPrefix(prefix) {
  const normalizedPrefix = normalizeValue(prefix);

  if (!normalizedPrefix) {
    return;
  }

  for (const key of responseCache.keys()) {
    if (String(key || '').startsWith(normalizedPrefix)) {
      responseCache.delete(key);
    }
  }
}

export function invalidateCachedValuesByContains(fragment) {
  const normalizedFragment = normalizeValue(fragment);

  if (!normalizedFragment) {
    return;
  }

  for (const key of responseCache.keys()) {
    if (String(key || '').includes(normalizedFragment)) {
      responseCache.delete(key);
    }
  }
}

export function invalidateCachedValuesWhere(matcher) {
  if (typeof matcher !== 'function') {
    return;
  }

  for (const key of responseCache.keys()) {
    if (matcher(String(key || ''))) {
      responseCache.delete(key);
    }
  }
}

export async function getOrLoadCachedValue({ cacheKey, enabled = true, ttlMs = DEFAULT_TTL_MS, loader }) {
  if (typeof loader !== 'function') {
    throw new Error('loader function is required');
  }

  const normalizedCacheKey = normalizeValue(cacheKey);
  const shouldUseCache = enabled && Boolean(normalizedCacheKey);

  if (!shouldUseCache) {
    return loader();
  }

  const now = Date.now();
  const cachedEntry = responseCache.get(normalizedCacheKey);

  if (cachedEntry?.value !== undefined && cachedEntry.expiresAt > now) {
    return cachedEntry.value;
  }

  if (cachedEntry?.inFlightPromise) {
    return cachedEntry.inFlightPromise;
  }

  const inFlightPromise = Promise.resolve()
    .then(() => loader())
    .then((value) => {
      responseCache.set(normalizedCacheKey, {
        expiresAt: Date.now() + Math.max(1, Number(ttlMs) || DEFAULT_TTL_MS),
        inFlightPromise: null,
        value,
      });
      pruneCache();
      return value;
    })
    .catch((error) => {
      responseCache.delete(normalizedCacheKey);
      throw error;
    });

  responseCache.set(normalizedCacheKey, {
    expiresAt: now + Math.max(1, Number(ttlMs) || DEFAULT_TTL_MS),
    inFlightPromise,
    value: undefined,
  });

  return inFlightPromise;
}
