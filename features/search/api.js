import { ACCOUNT_CLIENT } from '@/core/services/account/account-client';

import { SEARCH_LIMITS, SEARCH_TYPES } from './constants';
import { createSearchCacheKey, withClientSearchCache } from './cache';
import { rankAllMediaResults, resolvePreferredMediaType } from './ranking';
import { normalizeResult } from './result';
import { normalizeString } from './text';

function emptyMediaPage(page = 1) {
  return {
    page,
    results: [],
    totalPages: 0,
    totalResults: 0,
  };
}

function isSearchableMediaType(type) {
  return type === SEARCH_TYPES.MOVIE || type === SEARCH_TYPES.PERSON;
}

function isExactUserMatch(item, normalizedQuery) {
  const displayName = String(item?.displayName || '')
    .trim()
    .toLowerCase();
  const username = String(item?.username || '')
    .trim()
    .toLowerCase();

  return displayName === normalizedQuery || username === normalizedQuery;
}

export function inferSearchType({ normalizedQuery, userResults = [], mediaResults = [] }) {
  const resolvedQuery = normalizeString(normalizedQuery).toLowerCase();
  const exactUserMatch = userResults.find((item) => isExactUserMatch(item, resolvedQuery));

  if (exactUserMatch) {
    return SEARCH_TYPES.USER;
  }

  if (!mediaResults.length) {
    return SEARCH_TYPES.ALL;
  }

  const movieResults = mediaResults.filter((item) => item?.media_type === SEARCH_TYPES.MOVIE);
  const personResults = mediaResults.filter((item) => item?.media_type === SEARCH_TYPES.PERSON);
  const preferredMediaType = resolvePreferredMediaType({
    movieResults,
    personResults,
    query: resolvedQuery,
  });

  if (preferredMediaType !== SEARCH_TYPES.ALL) {
    return preferredMediaType;
  }

  return mediaResults[0]?.media_type || SEARCH_TYPES.ALL;
}

export async function fetchUsers(query, limitCount = SEARCH_LIMITS.USER_RESULTS) {
  const cacheKey = createSearchCacheKey('users', [query, limitCount]);

  return withClientSearchCache(cacheKey, async () => {
    try {
      const users = await ACCOUNT_CLIENT.searchAccounts(query, {
        limitCount,
        retryCount: 0,
        timeoutMs: 5000,
      });

      return users.map((item) => normalizeResult(item, SEARCH_TYPES.USER));
    } catch {
      return [];
    }
  });
}

export async function fetchMediaPage(query, type, page = 1, options = {}) {
  if (!isSearchableMediaType(type)) {
    return emptyMediaPage();
  }

  const scope = options.scope === 'full' ? 'full' : 'preview';
  const cacheKey = createSearchCacheKey('media-page', [query, type, page, scope]);

  return withClientSearchCache(cacheKey, async () => {
    try {
      const { TmdbService } = await import('@/core/services/tmdb/tmdb.service');
      const response = await TmdbService.searchContent(query, type, page, { scope });

      if (response.status !== 200 || !response.data?.results) {
        return emptyMediaPage();
      }

      const data = response.data;

      return {
        page: Number(data?.page) || page,
        results: data.results.map((item) => normalizeResult(item)),
        totalPages: Number(data?.total_pages) || 0,
        totalResults: Number(data?.total_results) || 0,
      };
    } catch {
      return emptyMediaPage();
    }
  });
}

export async function fetchMedia(query, type, options = {}) {
  const payload = await fetchMediaPage(query, type, 1, options);
  return payload.results;
}

export async function fetchAllMedia(query, page = 1, options = {}) {
  const [moviePayload, personPayload] = await Promise.all([
    fetchMediaPage(query, SEARCH_TYPES.MOVIE, page, options),
    fetchMediaPage(query, SEARCH_TYPES.PERSON, page, options),
  ]);

  return rankAllMediaResults(moviePayload.results, personPayload.results, query);
}

export function mergeAllResults(userResults, mediaResults, maxResults = SEARCH_LIMITS.MAX_RESULTS) {
  const merged = [...userResults, ...mediaResults];

  if (Number.isFinite(maxResults) && maxResults > 0) {
    return merged.slice(0, maxResults);
  }

  return merged;
}

export function limitMediaResults(results) {
  return results.slice(0, SEARCH_LIMITS.MEDIA_RESULTS);
}
