import { ACCOUNT_CLIENT } from '@/core/services/account/account-client';

import { SEARCH_LIMITS, SEARCH_TYPES } from '@/features/search/constants';
import { createSearchCacheKey, withClientSearchCache } from './client-cache';
import { rankAllMediaResults } from './ranking';
import { normalizeResult } from './result';

function normalizeCommunityType(type) {
  if (type === SEARCH_TYPES.LIST || type === SEARCH_TYPES.REVIEW) {
    return type;
  }

  return SEARCH_TYPES.ALL;
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
  if (type !== SEARCH_TYPES.MOVIE && type !== SEARCH_TYPES.PERSON) {
    return {
      page: 1,
      results: [],
      totalPages: 0,
      totalResults: 0,
    };
  }

  const scope = options.scope === 'full' ? 'full' : 'preview';
  const cacheKey = createSearchCacheKey('media-page', [query, type, page, scope]);

  return withClientSearchCache(cacheKey, async () => {
    try {
      const { TmdbService } = await import('@/core/services/tmdb/tmdb.service');
      const response = await TmdbService.searchContent(query, type, page, {
        scope,
      });

      if (response.status !== 200 || !response.data?.results) {
        return {
          page: 1,
          results: [],
          totalPages: 0,
          totalResults: 0,
        };
      }

      const data = response.data;

      return {
        page: Number(data?.page) || page,
        results: data.results.map((item) => normalizeResult(item)),
        totalPages: Number(data?.total_pages) || 0,
        totalResults: Number(data?.total_results) || 0,
      };
    } catch {
      return {
        page: 1,
        results: [],
        totalPages: 0,
        totalResults: 0,
      };
    }
  });
}

export async function fetchCommunity(query, type = SEARCH_TYPES.ALL, limitCount = SEARCH_LIMITS.COMMUNITY_RESULTS) {
  const communityType = normalizeCommunityType(type);
  const cacheKey = createSearchCacheKey('community', [query, communityType, limitCount]);

  return withClientSearchCache(cacheKey, async () => {
    try {
      const params = new URLSearchParams({
        limitCount: String(limitCount),
        q: query,
        type: communityType,
      });
      const response = await fetch(`/api/search/community?${params.toString()}`, {
        headers: {
          accept: 'application/json',
        },
      });

      if (!response.ok) {
        return [];
      }

      const payload = await response.json();
      const items = Array.isArray(payload?.items) ? payload.items : [];

      return items.map((item) => normalizeResult(item, item.media_type));
    } catch {
      return [];
    }
  });
}

export async function fetchAllMedia(query, page = 1, options = {}) {
  const [moviePayload, personPayload] = await Promise.all([
    fetchMediaPage(query, SEARCH_TYPES.MOVIE, page, options),
    fetchMediaPage(query, SEARCH_TYPES.PERSON, page, options),
  ]);

  return rankAllMediaResults(moviePayload.results, personPayload.results, query);
}

export async function fetchMedia(query, type, options = {}) {
  const payload = await fetchMediaPage(query, type, 1, options);
  return payload.results;
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
