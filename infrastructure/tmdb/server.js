import 'server-only';
import { cache } from 'react';
import { NextResponse } from 'next/server';
import {
  isPersonMediaType,
  isTvMediaType,
  isTitleMediaType,
  normalizeMediaType,
  TMDB_API_URL,
} from '@/shared';
import {
  CACHE_CONTROL,
  cacheControlHeaders,
  getOrLoadCachedValue,
} from '@/infrastructure/http/server';

import {
  TMDB_HEADERS,
  TMDB_FETCH_TIMEOUT_MS,
  TMDB_REVALIDATE,
  sanitizeMovieResults,
  sanitizeTvResults,
  withMediaType,
  sanitizeMovieDetail,
  sanitizeTvDetail,
  sanitizePersonDetail,
  SEARCH_SCAN_CONCURRENCY,
  SEARCH_PAGE_SIZE,
  resolveSearchScanPageLimit,
  resolveSearchPageSize,
  dedupeSearchItems,
  normalizeSearchResults,
  resolveSearchRuntimeCheckLimit,
  buildAuthorityFallbackItems,
  paginateSearchItems,
  createSearchQueryPolicy,
  normalizeSearchScope,
  createSearchFallbackQueries,
  resolveWatchRegionFromRequestHeaders,
} from './client.js';

export * from './client.js';

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
          return LAST_KNOWN_GOOD_TMDB_CACHE.get(cacheKey);
        }

        if (response?.status === 404) {
          return response;
        }

        const transientError = new Error(response?.error || 'TMDB request failed');
        transientError.status = response?.status || 503;
        transientError.response = response;
        throw transientError;
      },
    });

    return result;
  } catch (error) {
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

function getDetailAppendParam(parts = []) {
  const values = Array.isArray(parts) ? parts.filter(Boolean) : [];
  return values.length > 0 ? values.join(',') : undefined;
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

export const resolveTmdbDetailId = cache(async (id, type) => {
  const normalizedType = normalizeMediaType(type);

  if (typeof id !== 'string' || !id.startsWith('tt') || !isTitleMediaType(normalizedType)) {
    return id;
  }

  const response = await findByExternalId(id);
  const data = response.data;

  if (!data) {
    return id;
  }

  const results = normalizedType === 'tv' ? data.tv_results : data.movie_results;

  if (!Array.isArray(results) || results.length === 0) {
    return id;
  }

  return results[0]?.id || id;
});

export async function getEntityDetail(id, type, { append = [], revalidate, tags = [] } = {}) {
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

export async function hydrateMovieRuntime(item) {
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

export async function sanitizeMovieResultsWithRuntime(items = [], context = 'browse') {
  const safeItems = Array.isArray(items) ? items : [];

  if (context !== 'search') {
    return sanitizeMovieResults(safeItems, context);
  }

  const hydratedItems = await Promise.all(safeItems.map((item) => hydrateMovieRuntime(item)));

  return sanitizeMovieResults(hydratedItems, context);
}

function normalizeCatalogMediaType(mediaType) {
  const normalizedType = normalizeMediaType(mediaType);
  return normalizedType === 'all' || isTvMediaType(normalizedType) ? normalizedType : 'movie';
}

function createItemKey(item) {
  return `${item?.media_type || 'movie'}:${item?.id}`;
}

function interleaveMediaResults(movieResults = [], tvResults = []) {
  const items = [];
  const maxLength = Math.max(movieResults.length, tvResults.length);

  for (let index = 0; index < maxLength; index += 1) {
    if (movieResults[index]) items.push(movieResults[index]);
    if (tvResults[index]) items.push(tvResults[index]);
  }

  return items;
}

async function sanitizeCatalogResults(items = [], mediaType) {
  const normalizedMediaType = normalizeCatalogMediaType(mediaType);

  if (normalizedMediaType === 'movie') {
    return sanitizeMovieResultsWithRuntime(withMediaType(items, 'movie'), 'browse');
  }
  if (normalizedMediaType === 'tv') {
    return withMediaType(sanitizeTvResults(items, 'browse'), 'tv');
  }

  const movieResults = await sanitizeMovieResultsWithRuntime(
    withMediaType(
      items.filter((item) => normalizeMediaType(item?.media_type) === 'movie'),
      'movie',
    ),
    'browse',
  );
  const tvResults = withMediaType(
    sanitizeTvResults(
      items.filter((item) => normalizeMediaType(item?.media_type) === 'tv'),
      'browse',
    ),
    'tv',
  );
  const allowedKeys = new Set([...movieResults, ...tvResults].map(createItemKey));

  return items.filter((item) => allowedKeys.has(createItemKey(item)));
}

export const getTrending = cache(async (timeWindow = 'day', mediaType = 'movie') => {
  const normalizedMediaType = normalizeCatalogMediaType(mediaType);
  const response = await tmdbRequest(`/trending/${normalizedMediaType}/${timeWindow}`, {
    query: { language: 'en-US' },
    revalidate: TMDB_REVALIDATE.TRENDING,
    tags: [`tmdb:trending:${normalizedMediaType}:${timeWindow}`],
  });

  if (!response.data?.results) {
    return response;
  }

  const sanitizedResults = await sanitizeCatalogResults(response.data.results, normalizedMediaType);

  return {
    ...response,
    data: {
      ...response.data,
      results: sanitizedResults,
    },
  };
});

export const getGenres = cache(async (mediaType = 'movie') => {
  const normalizedMediaType = normalizeCatalogMediaType(mediaType) === 'tv' ? 'tv' : 'movie';
  const response = await tmdbRequest(`/genre/${normalizedMediaType}/list`, {
    query: { language: 'en-US' },
    revalidate: TMDB_REVALIDATE.GENRES,
    tags: [`tmdb:genres:${normalizedMediaType}`],
  });

  return {
    ...response,
    data: response.data?.genres || [],
  };
});

async function getDiscoverResponse({ genreId, mediaType, page, sortBy }) {
  const normalizedMediaType = normalizeCatalogMediaType(mediaType);
  const normalizedGenre = genreId && genreId !== 'all' ? String(genreId) : 'all';

  const response = await tmdbRequest(`/discover/${normalizedMediaType}`, {
    query: {
      language: 'en-US',
      page,
      sort_by: sortBy,
      ...(normalizedMediaType === 'movie' ? { 'with_runtime.gte': 40 } : {}),
      with_genres: normalizedGenre === 'all' ? undefined : normalizedGenre,
    },
    revalidate: TMDB_REVALIDATE.DISCOVER,
    tags: [
      `tmdb:discover:${normalizedMediaType}:${normalizedGenre}:${sortBy}`,
      `tmdb:discover:${normalizedMediaType}:page:${page}`,
    ],
  });

  return {
    ...response,
    data: response.data?.results
      ? {
          ...response.data,
          results: await sanitizeCatalogResults(response.data.results, normalizedMediaType),
        }
      : response.data,
  };
}

export const discoverContent = cache(
  async ({ genreId, mediaType = 'movie', page = 1, sortBy = 'popularity.desc' }) => {
    const normalizedMediaType = normalizeCatalogMediaType(mediaType);

    if (normalizedMediaType !== 'all') {
      return getDiscoverResponse({ genreId, mediaType: normalizedMediaType, page, sortBy });
    }

    const [movieResponse, tvResponse] = await Promise.all([
      getDiscoverResponse({ page, sortBy, mediaType: 'movie' }),
      getDiscoverResponse({ page, sortBy, mediaType: 'tv' }),
    ]);
    const movieData = movieResponse.data || {};
    const tvData = tvResponse.data || {};
    const totalPages = Math.max(
      Number(movieData.total_pages) || 0,
      Number(tvData.total_pages) || 0,
    );

    return {
      data: {
        page,
        results: interleaveMediaResults(movieData.results, tvData.results),
        total_pages: totalPages,
      },
      error: movieResponse.error && tvResponse.error ? movieResponse.error : null,
      status: movieResponse.status || tvResponse.status || 200,
    };
  },
);

export const getMovieBase = cache(async (id) =>
  getEntityDetail(id, 'movie', {
    append: ['credits', 'keywords', 'release_dates', 'videos', 'watch/providers'],
    revalidate: TMDB_REVALIDATE.DETAIL_BASE,
  }).then((response) => ({
    ...response,
    data: sanitizeMovieDetail(response?.data),
  })),
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
  }),
);

export const getTvBase = cache(async (id) =>
  getEntityDetail(id, 'tv', {
    append: [
      'aggregate_credits',
      'content_ratings',
      'credits',
      'keywords',
      'videos',
      'watch/providers',
    ],
    revalidate: TMDB_REVALIDATE.DETAIL_BASE,
  }).then((response) => ({
    ...response,
    data: sanitizeTvDetail(response?.data),
  })),
);

async function getTvSeasonDetails(tvId, seasons = []) {
  const visibleSeasons = (Array.isArray(seasons) ? seasons : []).filter(
    (season) => Number(season?.season_number) > 0 && Number(season?.episode_count) > 0,
  );

  if (!visibleSeasons.length) {
    return [];
  }

  const responses = await Promise.all(
    visibleSeasons.map((season) =>
      tmdbRequest(`/tv/${tvId}/season/${season.season_number}`, {
        query: { language: 'en-US' },
        revalidate: TMDB_REVALIDATE.DETAIL_SECONDARY,
        tags: [`tmdb:tv:${tvId}:season:${season.season_number}`],
      }).then((response) => response?.data || null),
    ),
  );

  return responses.filter(Boolean);
}

export const getTvSecondary = cache(async (id) =>
  getEntityDetail(id, 'tv', {
    append: ['images', 'recommendations', 'similar'],
    revalidate: TMDB_REVALIDATE.DETAIL_SECONDARY,
    tags: ['tmdb:tv:secondary'],
  }).then(async (response) => {
    const data = response?.data;

    if (!data) {
      return {
        ...response,
        data,
      };
    }

    const [seasonDetails] = await Promise.all([getTvSeasonDetails(id, data?.seasons)]);

    return {
      ...response,
      data: sanitizeTvDetail({
        ...data,
        recommendations: data?.recommendations
          ? {
              ...data.recommendations,
              results: withMediaType(data.recommendations.results || [], 'tv'),
            }
          : data?.recommendations,
        seasonDetails,
        similar: data?.similar
          ? {
              ...data.similar,
              results: withMediaType(data.similar.results || [], 'tv'),
            }
          : data?.similar,
      }),
    };
  }),
);

export const getPersonBase = cache(async (id) =>
  getEntityDetail(id, 'person', {
    append: ['external_ids'],
    revalidate: TMDB_REVALIDATE.DETAIL_BASE,
  }).then((response) => ({
    ...response,
    data: sanitizePersonDetail(response?.data),
  })),
);

export const getPersonSecondary = cache(async (id) =>
  getEntityDetail(id, 'person', {
    append: ['images', 'movie_credits', 'tv_credits', 'tagged_images'],
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
    const tvCastCredits = withMediaType(
      sanitizeTvResults(data?.tv_credits?.cast || [], 'credits'),
      'tv',
    );
    const tvCrewCredits = withMediaType(
      sanitizeTvResults(data?.tv_credits?.crew || [], 'credits'),
      'tv',
    );

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
        tv_credits: data?.tv_credits
          ? {
              ...data.tv_credits,
              cast: tvCastCredits,
              crew: tvCrewCredits,
            }
          : data?.tv_credits,
      }),
    };
  }),
);

function createEmptySearchResponse(page = 1) {
  return {
    data: {
      page: Number(page) || 1,
      results: [],
      total_pages: 1,
      total_results: 0,
    },
    status: 200,
  };
}

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
      (_, index) => startPage + index,
    );
    const batchResponses = await Promise.all(
      pageBatch.map((nextPage) => requestTmdbSearchPage(query, type, nextPage)),
    );

    batchResponses.forEach((response) => {
      const nextItems = withMediaType(response.data?.results || [], type);

      if (nextItems.length > 0) {
        collectedItems.push(...nextItems);
      }
    });
  }

  return collectedItems;
}

async function resolveExpandedSearchIndex(
  query,
  type = 'movie',
  rankingQuery = query,
  options = {},
) {
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
  const remainingItems =
    scanTotalPages > 1 ? await collectAllTmdbSearchItems(query, type, scanTotalPages) : [];
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
    query === rankingQuery
      ? buildAuthorityFallbackItems(mergedItems, type, { ...options, query: rankingQuery })
      : [];

  return {
    pageSize,
    resolvedItems: resolvedItems.length > 0 ? resolvedItems : fallbackItems,
    response,
  };
}

async function requestExpandedSearchContent(
  query,
  type = 'movie',
  page = 1,
  rankingQuery = query,
  options = {},
) {
  const { pageSize, resolvedItems, response } = await resolveExpandedSearchIndex(
    query,
    type,
    rankingQuery,
    options,
  );
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
  const type = isPersonMediaType(searchType)
    ? 'person'
    : isTvMediaType(searchType)
      ? 'tv'
      : 'movie';
  const queryPolicy = createSearchQueryPolicy(query);

  if (!queryPolicy.isEligible) {
    return createEmptySearchResponse(page);
  }

  const scope = normalizeSearchScope(options.scope);
  const { resolvedQuery } = queryPolicy;
  const response = await requestExpandedSearchContent(resolvedQuery, type, page, resolvedQuery, {
    scope,
    ...(type === 'tv' ? { runtimeCheckLimit: 0 } : {}),
  });

  if (Array.isArray(response.data?.results) && response.data.results.length > 0) {
    return response;
  }

  if (page !== 1) {
    return response;
  }

  const fallbackQueries = createSearchFallbackQueries(resolvedQuery);

  for (const fallbackQuery of fallbackQueries) {
    const fallbackResponse = await requestExpandedSearchContent(
      fallbackQuery,
      type,
      page,
      resolvedQuery,
      {
        scope,
        ...(type === 'tv' ? { runtimeCheckLimit: 0 } : {}),
      },
    );

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

const TMDB_ACTIONS = Object.freeze({
  DISCOVER: 'discover',
  GENRES: 'genres',
  SEARCH: 'search',
  TRENDING: 'trending',
  WATCH_REGION: 'watch-region',
});

const DEFAULT_MOVIE_LIMIT = 3;
const MAX_MOVIE_LIMIT = 6;

function mapMovie(movie) {
  return {
    id: movie.id,
    title: movie.title || movie.original_title || 'Untitled',
    posterPath: `https://image.tmdb.org/t/p/w780${movie.poster_path}`,
    backdropPath: `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`,
    year: movie.release_date ? movie.release_date.slice(0, 4) : null,
    rating: movie.vote_average ? movie.vote_average.toFixed(1) : null,
    overview: movie.overview || '',
  };
}

function pickStableMovies(movies, limit) {
  if (movies.length <= limit) {
    return movies.slice(0, limit);
  }

  const rotationWindow = Math.floor(Date.now() / (1000 * 60 * 60 * 6));
  const startIndex = rotationWindow % movies.length;

  return Array.from({ length: limit }, (_, index) => movies[(startIndex + index) % movies.length]);
}

function resolveLimit(rawLimit) {
  const parsedLimit = Number(rawLimit || DEFAULT_MOVIE_LIMIT);

  if (!Number.isFinite(parsedLimit) || parsedLimit < 1) {
    return DEFAULT_MOVIE_LIMIT;
  }

  return Math.min(Math.floor(parsedLimit), MAX_MOVIE_LIMIT);
}

function createSearchEmptyResponse() {
  return NextResponse.json(
    {
      page: 1,
      results: [],
      total_pages: 0,
      total_results: 0,
    },
    {
      headers: cacheControlHeaders(CACHE_CONTROL.PUBLIC_TMDB_SEARCH),
    },
  );
}

async function handleDiscover(request) {
  const searchParams = request.nextUrl.searchParams;
  const genreId = searchParams.get('genreId') || 'all';
  const rawMediaType = searchParams.get('mediaType');
  const mediaType = rawMediaType === 'all' ? 'all' : rawMediaType === 'tv' ? 'tv' : 'movie';
  const page = Number(searchParams.get('page') || 1);
  const sortBy = searchParams.get('sortBy') || 'popularity.desc';

  const response = await discoverContent({
    genreId,
    mediaType,
    page,
    sortBy,
  });

  return NextResponse.json(response.data || { results: [] }, {
    status: response.status || 200,
    headers: cacheControlHeaders(CACHE_CONTROL.PUBLIC_TMDB_DISCOVER),
  });
}

async function handleGenres(request) {
  const mediaType = request.nextUrl.searchParams.get('mediaType') === 'tv' ? 'tv' : 'movie';
  const response = await getGenres(mediaType);

  return NextResponse.json(response.data || [], {
    status: response.status || 200,
    headers: cacheControlHeaders(CACHE_CONTROL.PUBLIC_TMDB_GENRES),
  });
}

async function handleSearch(request) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  const rawType = searchParams.get('type');
  const type = rawType === 'person' ? 'person' : rawType === 'tv' ? 'tv' : 'movie';
  const page = Number(searchParams.get('page') || 1);
  const scope = searchParams.get('scope') === 'full' ? 'full' : 'preview';

  if (!query.trim()) {
    return createSearchEmptyResponse();
  }

  const response = await searchContent(query, type, page, { scope });
  const data = response.data || { results: [] };

  return NextResponse.json(data, {
    status: response.status || 200,
    headers: cacheControlHeaders(CACHE_CONTROL.PUBLIC_TMDB_SEARCH),
  });
}

async function handleTrending(request) {
  try {
    const limit = resolveLimit(request.nextUrl.searchParams.get('limit'));
    const response = await getTrending('day', 'movie');

    if (!response.data?.results) {
      return NextResponse.json(
        { movies: [], poster: null },
        { headers: cacheControlHeaders(CACHE_CONTROL.NO_STORE) },
      );
    }

    const candidates = response.data.results.filter(
      (movie) => movie.poster_path && movie.backdrop_path && movie.vote_average > 5,
    );

    if (candidates.length === 0) {
      return NextResponse.json(
        { movies: [], poster: null },
        { headers: cacheControlHeaders(CACHE_CONTROL.NO_STORE) },
      );
    }

    const movies = pickStableMovies(candidates, limit).map(mapMovie);
    const poster = movies[0] || null;

    return NextResponse.json(
      {
        movies,
        poster,
      },
      {
        headers: cacheControlHeaders(CACHE_CONTROL.PUBLIC_TMDB_TRENDING),
      },
    );
  } catch {
    return NextResponse.json(
      { movies: [], poster: null },
      { headers: cacheControlHeaders(CACHE_CONTROL.PUBLIC_TMDB_ERROR_FALLBACK) },
    );
  }
}

async function handleWatchRegion(request) {
  return NextResponse.json(resolveWatchRegionFromRequestHeaders(request.headers), {
    headers: cacheControlHeaders(CACHE_CONTROL.NO_STORE),
  });
}

export async function GET(request) {
  const action = request.nextUrl.searchParams.get('action') || '';

  switch (action) {
    case TMDB_ACTIONS.DISCOVER:
      return handleDiscover(request);
    case TMDB_ACTIONS.GENRES:
      return handleGenres(request);
    case TMDB_ACTIONS.SEARCH:
      return handleSearch(request);
    case TMDB_ACTIONS.TRENDING:
      return handleTrending(request);
    case TMDB_ACTIONS.WATCH_REGION:
      return handleWatchRegion(request);
    default:
      return NextResponse.json(
        {
          error: action ? `Unsupported tmdb action: ${action}` : 'action is required',
        },
        {
          status: 400,
          headers: cacheControlHeaders(CACHE_CONTROL.NO_STORE),
        },
      );
  }
}

