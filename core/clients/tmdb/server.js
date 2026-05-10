import 'server-only';

import { cache } from 'react';

import { isPersonMediaType, normalizeMediaType } from '@/core/utils/media';
import { sanitizeMovieDetail, sanitizeMovieResults, sanitizePersonDetail } from '@/core/clients/tmdb/sanitize';

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

async function requestTmdbSearchPage(query, type = 'movie', page = 1) {
  const response = await tmdbRequest(`/search/${type}`, {
    query: {
      query,
      page,
      language: 'en-US',
    },
    revalidate: TMDB_REVALIDATE.SEARCH,
    tags: [`tmdb:search:${type}`],
  });

  return response;
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
    runtimeCheckLimit: resolveSearchRuntimeCheckLimit(options.scope),
    scope: options.scope,
  });
  const fallbackItems = buildAuthorityFallbackItems(mergedItems, type, options);

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

function getDetailAppendParam(parts = []) {
  const values = Array.isArray(parts) ? parts.filter(Boolean) : [];
  return values.length > 0 ? values.join(',') : undefined;
}

const resolveTmdbDetailId = cache(async (id, type) => {
  if (typeof id !== 'string' || !id.startsWith('tt') || normalizeMediaType(type) !== 'movie') {
    return id;
  }

  const response = await findByExternalId(id);
  const data = response.data;

  if (!data) {
    return id;
  }

  const results = data.movie_results;

  if (!Array.isArray(results) || results.length === 0) {
    return id;
  }

  return results[0]?.id || id;
});

const resolveMovieRuntime = cache(async (id) => {
  const targetId = await resolveTmdbDetailId(id, 'movie');
  const response = await tmdbRequest(`/movie/${targetId}`, {
    query: {
      language: 'en-US',
    },
    revalidate: TMDB_REVALIDATE.DETAIL_BASE,
    tags: ['tmdb:movie:runtime', `tmdb:movie:${targetId}:runtime`],
  });

  return response?.data?.runtime ?? null;
});

async function hydrateMovieRuntime(item) {
  if (!item || typeof item !== 'object' || !item?.id) {
    return item;
  }

  if (Number.isFinite(Number(item?.runtime)) && Number(item.runtime) > 0) {
    return item;
  }

  const runtime = await resolveMovieRuntime(item.id);

  if (!Number.isFinite(Number(runtime)) || Number(runtime) <= 0) {
    return item;
  }

  return {
    ...item,
    runtime: Number(runtime),
  };
}

async function sanitizeMovieResultsWithRuntime(items = [], context = 'browse') {
  const safeItems = Array.isArray(items) ? items : [];

  if (context !== 'search') {
    return sanitizeMovieResults(safeItems, context);
  }

  const hydratedItems = await Promise.all(safeItems.map((item) => hydrateMovieRuntime(item)));

  return sanitizeMovieResults(hydratedItems, context);
}

async function getEntityDetail(id, type, { append = [], revalidate, tags = [] } = {}) {
  const targetId = await resolveTmdbDetailId(id, type);
  const appendToResponse = getDetailAppendParam(append);

  const response = await tmdbRequest(`/${type}/${targetId}`, {
    query: {
      language: 'en-US',
      append_to_response: appendToResponse,
      ...(append.includes('images') && {
        include_image_language: 'en,null',
      }),
    },
    revalidate,
    tags: [`tmdb:${type}`, `tmdb:${type}:${targetId}`, ...tags],
  });

  return {
    ...response,
    targetId,
  };
}

async function findByExternalId(externalId, source = 'imdb_id') {
  return tmdbRequest(`/find/${externalId}`, {
    query: {
      external_source: source,
      language: 'en-US',
    },
    revalidate: TMDB_REVALIDATE.DETAIL_BASE,
    tags: ['tmdb:find'],
  });
}

export const getTrending = cache(async (timeWindow = 'day', mediaType = 'movie') => {
  const normalizedMediaType = normalizeMediaType(mediaType) === 'movie' ? 'movie' : 'movie';
  const response = await tmdbRequest(`/trending/${normalizedMediaType}/${timeWindow}`, {
    query: { language: 'en-US' },
    revalidate: TMDB_REVALIDATE.TRENDING,
    tags: [`tmdb:trending:${normalizedMediaType}:${timeWindow}`],
  });

  if (!response.data?.results) {
    return response;
  }

  const sanitizedResults = await sanitizeMovieResultsWithRuntime(
    withMediaType(response.data.results, normalizedMediaType),
    'browse'
  );

  return {
    ...response,
    data: {
      ...response.data,
      results: sanitizedResults,
    },
  };
});

export const getGenres = cache(async () => {
  const response = await tmdbRequest('/genre/movie/list', {
    query: { language: 'en-US' },
    revalidate: TMDB_REVALIDATE.GENRES,
    tags: ['tmdb:genres:movie'],
  });

  return {
    ...response,
    data: response.data?.genres || [],
  };
});

export const discoverContent = cache(async ({ genreId, page = 1, sortBy = 'popularity.desc' }) => {
  const normalizedGenre = genreId && genreId !== 'all' ? String(genreId) : 'all';

  const response = await tmdbRequest('/discover/movie', {
    query: {
      language: 'en-US',
      page,
      sort_by: sortBy,
      'with_runtime.gte': 40,
      with_genres: normalizedGenre === 'all' ? undefined : normalizedGenre,
    },
    revalidate: TMDB_REVALIDATE.DISCOVER,
    tags: [`tmdb:discover:movie:${normalizedGenre}:${sortBy}`, `tmdb:discover:movie:page:${page}`],
  });

  if (!response.data?.results) {
    return response;
  }

  const sanitizedResults = await sanitizeMovieResultsWithRuntime(
    withMediaType(response.data.results, 'movie'),
    'browse'
  );

  return {
    ...response,
    data: {
      ...response.data,
      results: sanitizedResults,
    },
  };
});

export async function searchContent(query, searchType = 'movie', page = 1, options = {}) {
  const type = isPersonMediaType(searchType) ? 'person' : 'movie';
  const scope = normalizeSearchScope(options.scope);
  const response = await requestExpandedSearchContent(query, type, page, query, { scope });

  if (Array.isArray(response.data?.results) && response.data.results.length > 0) {
    return response;
  }

  if (page !== 1) {
    return response;
  }

  const fallbackQueries = createSearchFallbackQueries(query);

  for (const fallbackQuery of fallbackQueries) {
    const fallbackResponse = await requestExpandedSearchContent(fallbackQuery, type, page, query, { scope });

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

export const getMovieBase = cache(async (id) =>
  getEntityDetail(id, 'movie', {
    append: ['credits', 'keywords', 'release_dates', 'videos', 'watch/providers'],
    revalidate: TMDB_REVALIDATE.DETAIL_BASE,
  }).then((response) => ({
    ...response,
    data: sanitizeMovieDetail(response?.data),
  }))
);

export const getMovieSecondary = cache(async (id) =>
  getEntityDetail(id, 'movie', {
    append: ['images', 'recommendations', 'similar'],
    revalidate: TMDB_REVALIDATE.DETAIL_SECONDARY,
    tags: ['tmdb:movie:secondary'],
  }).then(async (response) => {
    const data = response?.data;

    if (!data) {
      return {
        ...response,
        data,
      };
    }

    const [recommendations, similar] = await Promise.all([
      sanitizeMovieResultsWithRuntime(data?.recommendations?.results || [], 'browse'),
      sanitizeMovieResultsWithRuntime(data?.similar?.results || [], 'browse'),
    ]);

    return {
      ...response,
      data: sanitizeMovieDetail({
        ...data,
        recommendations: data?.recommendations
          ? {
              ...data.recommendations,
              results: recommendations,
            }
          : data?.recommendations,
        similar: data?.similar
          ? {
              ...data.similar,
              results: similar,
            }
          : data?.similar,
      }),
    };
  })
);

export const getPersonBase = cache(async (id) =>
  getEntityDetail(id, 'person', {
    append: ['external_ids'],
    revalidate: TMDB_REVALIDATE.DETAIL_BASE,
  }).then((response) => ({
    ...response,
    data: sanitizePersonDetail(response?.data),
  }))
);

export const getPersonSecondary = cache(async (id) =>
  getEntityDetail(id, 'person', {
    append: ['images', 'movie_credits', 'tagged_images'],
    revalidate: TMDB_REVALIDATE.DETAIL_SECONDARY,
    tags: ['tmdb:person:secondary'],
  }).then(async (response) => {
    const data = response?.data;

    if (!data) {
      return {
        ...response,
        data,
      };
    }

    const [castCredits, crewCredits] = await Promise.all([
      sanitizeMovieResultsWithRuntime(data?.movie_credits?.cast || [], 'credits'),
      sanitizeMovieResultsWithRuntime(data?.movie_credits?.crew || [], 'credits'),
    ]);

    return {
      ...response,
      data: sanitizePersonDetail({
        ...data,
        movie_credits: data?.movie_credits
          ? {
              ...data.movie_credits,
              cast: castCredits,
              crew: crewCredits,
            }
          : data?.movie_credits,
      }),
    };
  })
);
