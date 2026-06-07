import 'server-only';

import { isPersonMediaType, isTvMediaType } from '@/core/utils/media';

import { SEARCH_PAGE_SIZE, SEARCH_SCAN_CONCURRENCY, TMDB_REVALIDATE } from './config';
import { tmdbRequest } from './request';
import {
  buildAuthorityFallbackItems,
  createSearchFallbackQueries,
  dedupeSearchItems,
  normalizeSearchResults,
  normalizeSearchScope,
  paginateSearchItems,
  resolveSearchPageSize,
  resolveSearchRuntimeCheckLimit,
  resolveSearchScanPageLimit,
  withMediaType,
} from './search-ranking';
import { hydrateMovieRuntime } from './runtime-sanitize.server';

async function requestTmdbSearchPage(query, type = 'movie', page = 1) {
  return tmdbRequest(`/search/${type}`, {
    query: {
      query,
      page,
      language: 'en-US',
    },
    revalidate: TMDB_REVALIDATE.SEARCH,
    tags: [`tmdb:search:${type}`],
  });
}

async function collectAllTmdbSearchItems(query, type = 'movie', totalPages = 1) {
  const collectedItems = [];

  for (let startPage = 2; startPage <= totalPages; startPage += SEARCH_SCAN_CONCURRENCY) {
    const pageBatch = Array.from(
      { length: Math.min(SEARCH_SCAN_CONCURRENCY, totalPages - startPage + 1) },
      (_, index) => startPage + index
    );
    const batchResponses = await Promise.all(pageBatch.map((nextPage) => requestTmdbSearchPage(query, type, nextPage)));

    batchResponses.forEach((response) => {
      const nextItems = withMediaType(response.data?.results || [], type);

      if (nextItems.length > 0) {
        collectedItems.push(...nextItems);
      }
    });
  }

  return collectedItems;
}

async function resolveExpandedSearchIndex(query, type = 'movie', rankingQuery = query, options = {}) {
  const response = await requestTmdbSearchPage(query, type, 1);

  if (!response.data?.results) {
    return {
      pageSize: SEARCH_PAGE_SIZE,
      resolvedItems: [],
      response,
    };
  }

  const totalPages = Math.max(1, Number(response.data?.total_pages) || 1);
  const scanPageLimit = Math.max(1, resolveSearchScanPageLimit(rankingQuery, type, options.scope));
  const scanTotalPages = Math.min(totalPages, scanPageLimit);
  const pageSize = resolveSearchPageSize(response.data.results);
  const firstPageItems = withMediaType(response.data.results, type);
  const remainingItems = scanTotalPages > 1 ? await collectAllTmdbSearchItems(query, type, scanTotalPages) : [];
  const mergedItems = dedupeSearchItems([...firstPageItems, ...remainingItems]);
  const resolvedItems = await normalizeSearchResults(mergedItems, rankingQuery, type, {
    hydrateMovieRuntime,
    runtimeCheckLimit:
      options.runtimeCheckLimit === 0
        ? 0
        : (options.runtimeCheckLimit ?? resolveSearchRuntimeCheckLimit(options.scope)),
    scope: options.scope,
  });
  const fallbackItems =
    query === rankingQuery ? buildAuthorityFallbackItems(mergedItems, type, { ...options, query: rankingQuery }) : [];

  return {
    pageSize,
    resolvedItems: resolvedItems.length > 0 ? resolvedItems : fallbackItems,
    response,
  };
}

async function requestExpandedSearchContent(query, type = 'movie', page = 1, rankingQuery = query, options = {}) {
  const { pageSize, resolvedItems, response } = await resolveExpandedSearchIndex(query, type, rankingQuery, options);
  const paginatedData = paginateSearchItems(resolvedItems, page, pageSize);

  return {
    ...response,
    data: {
      ...response.data,
      ...paginatedData,
    },
  };
}

export async function searchContent(query, searchType = 'movie', page = 1, options = {}) {
  const type = isPersonMediaType(searchType) ? 'person' : isTvMediaType(searchType) ? 'tv' : 'movie';
  const scope = normalizeSearchScope(options.scope);
  const response = await requestExpandedSearchContent(query, type, page, query, {
    scope,
    ...(type === 'tv' ? { runtimeCheckLimit: 0 } : {}),
  });

  if (Array.isArray(response.data?.results) && response.data.results.length > 0) {
    return response;
  }

  if (page !== 1) {
    return response;
  }

  const fallbackQueries = createSearchFallbackQueries(query);

  for (const fallbackQuery of fallbackQueries) {
    const fallbackResponse = await requestExpandedSearchContent(fallbackQuery, type, page, query, {
      scope,
      ...(type === 'tv' ? { runtimeCheckLimit: 0 } : {}),
    });

    if (Array.isArray(fallbackResponse.data?.results) && fallbackResponse.data.results.length > 0) {
      return {
        ...fallbackResponse,
        data: {
          ...fallbackResponse.data,
          page,
        },
      };
    }
  }

  return response;
}
