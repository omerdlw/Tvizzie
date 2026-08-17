import 'server-only';

import { TMDB_API_URL } from '@/domains/shell/shared/constants';
import { getOrLoadCachedValue } from '@/infrastructure/http/http-server';
import { TMDB_FETCH_TIMEOUT_MS, TMDB_HEADERS } from './tmdb-client-config';

function resolveTmdbHeaders() {
  const apiKey = process.env.TMDB_API_KEY || '';
  if (!apiKey) {
    throw new Error('TMDB_API_KEY is missing. Configure TMDB_API_KEY on the server.');
  }

  return {
    ...TMDB_HEADERS,
    Authorization: `Bearer ${apiKey}`,
  };
}

export function buildTmdbUrl(pathname, query = {}) {
  const normalizedPath = String(pathname || '').replace(/^\/+/, '');
  const url = new URL(normalizedPath, `${TMDB_API_URL.replace(/\/$/, '')}/`);

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    url.searchParams.set(key, String(value));
  });

  return url;
}

// Resilient memory cache fallback for transient TMDb failures
const LAST_KNOWN_GOOD_TMDB_CACHE = new Map();
const MAX_FALLBACK_CACHE_ENTRIES = 500;

async function fetchSingleTmdbRequest(pathname, { query, revalidate, tags } = {}) {
  const resolvedTtl = Math.max(Number(revalidate) || 600, 60);
  const tmdbUrl = buildTmdbUrl(pathname, query);

  try {
    const timeoutSignal = AbortSignal.timeout(TMDB_FETCH_TIMEOUT_MS);

    const response = await fetch(tmdbUrl, {
      headers: resolveTmdbHeaders(),
      next: {
        revalidate: resolvedTtl,
        tags: ['tmdb', ...(tags || [])],
      },
      cf: {
        cacheTtl: resolvedTtl,
        cacheEverything: true,
      },
      signal: timeoutSignal,
    });

    if (!response.ok) {
      return {
        data: null,
        error: `TMDB request failed with status ${response.status}`,
        status: response.status,
      };
    }

    const data = await response.json();
    return {
      data,
      error: null,
      status: response.status,
    };
  } catch (error) {
    const reason = error?.cause?.code || error?.code || error?.message || 'unknown';

    return {
      data: null,
      error: `TMDB request failed: ${reason}`,
      status: 503,
    };
  }
}

async function executeRawTmdbRequest(pathname, options = {}) {
  let response = await fetchSingleTmdbRequest(pathname, options);

  // Retry once on transient failures (5xx or timeout/network error)
  if (response.status >= 500 || response.error) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    response = await fetchSingleTmdbRequest(pathname, options);
  }

  return response;
}

export async function tmdbRequest(pathname, { query, revalidate, tags } = {}) {
  const normalizedPath = String(pathname || '').trim();
  const sortedQuery = query
    ? Object.keys(query)
        .sort()
        .reduce((acc, key) => {
          if (query[key] !== undefined && query[key] !== null) {
            acc[key] = query[key];
          }
          return acc;
        }, {})
    : {};

  const cacheKey = `tmdb|path=${normalizedPath}|q=${JSON.stringify(sortedQuery)}`;
  const resolvedTtlMs = Math.max(Number(revalidate) || 600, 60) * 1000;

  try {
    const result = await getOrLoadCachedValue({
      cacheKey,
      enabled: true,
      ttlMs: resolvedTtlMs,
      loader: async () => {
        const response = await executeRawTmdbRequest(normalizedPath, {
          query: sortedQuery,
          revalidate,
          tags,
        });

        if (response?.data && !response?.error) {
          LAST_KNOWN_GOOD_TMDB_CACHE.set(cacheKey, response);
          if (LAST_KNOWN_GOOD_TMDB_CACHE.size > MAX_FALLBACK_CACHE_ENTRIES) {
            const firstKey = LAST_KNOWN_GOOD_TMDB_CACHE.keys().next().value;
            LAST_KNOWN_GOOD_TMDB_CACHE.delete(firstKey);
          }
          return response;
        }

        if (LAST_KNOWN_GOOD_TMDB_CACHE.has(cacheKey)) {
          // Serve resilient stale cache if live call temporarily failed
          return LAST_KNOWN_GOOD_TMDB_CACHE.get(cacheKey);
        }

        // For 404s, allow caching the negative response
        if (response?.status === 404) {
          return response;
        }

        // Do not cache transient errors (5xx, timeout, network failure) in memoryCache
        const transientError = new Error(response?.error || 'TMDB request failed');
        transientError.status = response?.status || 503;
        transientError.response = response;
        throw transientError;
      },
    });

    return result;
  } catch (error) {
    // If loader threw or failed, check resilient fallback first
    if (LAST_KNOWN_GOOD_TMDB_CACHE.has(cacheKey)) {
      return LAST_KNOWN_GOOD_TMDB_CACHE.get(cacheKey);
    }

    if (error?.response) {
      return error.response;
    }

    return {
      data: null,
      error: error?.message || 'TMDB request failed',
      status: error?.status || 503,
    };
  }
}
