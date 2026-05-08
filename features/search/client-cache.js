import { normalizeString } from './text';

const SEARCH_CLIENT_CACHE_TTL_MS = 1000 * 60 * 5;

const SEARCH_CLIENT_CACHE_MAX_ENTRIES = 120;
const SEARCH_CLIENT_CACHE_VERSION = 'v2';

const searchClientCache = new Map();

const searchClientInFlight = new Map();

export function createSearchCacheKey(prefix, parts = []) {
  return [SEARCH_CLIENT_CACHE_VERSION, prefix, ...parts.map((value) => normalizeString(value).toLowerCase())].join(
    '::'
  );
}

function readSearchCache(key) {
  const entry = searchClientCache.get(key);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    searchClientCache.delete(key);
    return null;
  }

  return entry.value;
}

function writeSearchCache(key, value) {
  if (searchClientCache.size >= SEARCH_CLIENT_CACHE_MAX_ENTRIES) {
    const oldestKey = searchClientCache.keys().next().value;

    if (oldestKey) {
      searchClientCache.delete(oldestKey);
    }
  }

  searchClientCache.set(key, {
    expiresAt: Date.now() + SEARCH_CLIENT_CACHE_TTL_MS,
    value,
  });
}

export async function withClientSearchCache(key, load) {
  const cachedValue = readSearchCache(key);

  if (cachedValue !== null) {
    return cachedValue;
  }

  if (searchClientInFlight.has(key)) {
    return searchClientInFlight.get(key);
  }

  const requestPromise = Promise.resolve()
    .then(load)
    .then((value) => {
      writeSearchCache(key, value);
      return value;
    })
    .finally(() => {
      searchClientInFlight.delete(key);
    });

  searchClientInFlight.set(key, requestPromise);
  return requestPromise;
}
