import 'server-only';

import { cache } from 'react';

import { TMDB_API_URL } from '@/core/constants';
import { isPersonMediaType, normalizeMediaType } from '@/core/utils/media';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '';

function resolveTimeoutMs(value, fallback) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

const TMDB_FETCH_TIMEOUT_MS = resolveTimeoutMs(process.env.TMDB_FETCH_TIMEOUT_MS, 4500);

const TMDB_HEADERS = Object.freeze({
  accept: 'application/json',
});

export const TMDB_REVALIDATE = Object.freeze({
  TRENDING: 600,
  DISCOVER: 1800,
  GENRES: 60 * 60 * 24 * 7,
  DETAIL_BASE: 3600,
  DETAIL_SECONDARY: 60 * 60 * 6,
  SEARCH: 300,
});

function resolveTmdbHeaders() {
  if (!TMDB_API_KEY) {
    throw new Error('TMDB_API_KEY is missing. Configure TMDB_API_KEY on the server.');
  }

  return {
    ...TMDB_HEADERS,
    Authorization: `Bearer ${TMDB_API_KEY}`,
  };
}

function buildTmdbUrl(pathname, query = {}) {
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

async function tmdbRequest(pathname, { query, revalidate, tags } = {}) {
  let response;

  try {
    const timeoutSignal = AbortSignal.timeout(TMDB_FETCH_TIMEOUT_MS);

    response = await fetch(buildTmdbUrl(pathname, query), {
      headers: resolveTmdbHeaders(),
      next: {
        revalidate,
        tags: ['tmdb', ...(tags || [])],
      },
      signal: timeoutSignal,
    });
  } catch (error) {
    const reason = error?.cause?.code || error?.code || error?.message || 'unknown';

    return {
      data: null,
      error: `TMDB request failed: ${reason}`,
      status: 503,
    };
  }

  if (!response.ok) {
    return {
      data: null,
      error: `TMDB request failed with status ${response.status}`,
      status: response.status,
    };
  }

  return {
    data: await response.json(),
    error: null,
    status: response.status,
  };
}

function withMediaType(items = [], mediaType) {
  return (items || []).map((item) => ({
    ...item,
    media_type: item?.media_type || mediaType,
  }));
}

function normalizeSearchResults(items = [], requestedType = 'movie') {
  const normalizedType = isPersonMediaType(requestedType) ? 'person' : 'movie';

  return withMediaType(items, normalizedType)
    .filter((item) => ['movie', 'person'].includes(item?.media_type || ''))
    .sort((first, second) => (second.vote_count || 0) - (first.vote_count || 0));
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

export async function findByExternalId(externalId, source = 'imdb_id') {
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

  return {
    ...response,
    data: {
      ...response.data,
      results: withMediaType(response.data.results, normalizedMediaType),
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
      with_genres: normalizedGenre === 'all' ? undefined : normalizedGenre,
    },
    revalidate: TMDB_REVALIDATE.DISCOVER,
    tags: [`tmdb:discover:movie:${normalizedGenre}:${sortBy}`, `tmdb:discover:movie:page:${page}`],
  });

  if (!response.data?.results) {
    return response;
  }

  return {
    ...response,
    data: {
      ...response.data,
      results: withMediaType(response.data.results, 'movie'),
    },
  };
});

export const searchContent = cache(async (query, searchType = 'movie', page = 1) => {
  const type = isPersonMediaType(searchType) ? 'person' : 'movie';

  const response = await tmdbRequest(`/search/${type}`, {
    query: {
      query,
      page,
      language: 'en-US',
    },
    revalidate: TMDB_REVALIDATE.SEARCH,
    tags: [`tmdb:search:${type}`],
  });

  if (!response.data?.results) {
    return response;
  }

  return {
    ...response,
    data: {
      ...response.data,
      results: normalizeSearchResults(response.data.results, type),
    },
  };
});

export const getMovieBase = cache(async (id) =>
  getEntityDetail(id, 'movie', {
    append: ['credits', 'keywords', 'release_dates', 'videos', 'watch/providers'],
    revalidate: TMDB_REVALIDATE.DETAIL_BASE,
  })
);

export const getMovieSecondary = cache(async (id) =>
  getEntityDetail(id, 'movie', {
    append: ['images', 'recommendations', 'similar'],
    revalidate: TMDB_REVALIDATE.DETAIL_SECONDARY,
    tags: ['tmdb:movie:secondary'],
  })
);

export const getMovieImages = cache(async (id) => {
  const targetId = await resolveTmdbDetailId(id, 'movie');

  return tmdbRequest(`/movie/${targetId}/images`, {
    query: {
      include_image_language: 'en,null',
    },
    revalidate: TMDB_REVALIDATE.DETAIL_SECONDARY,
    tags: ['tmdb:movie:images', `tmdb:movie:${targetId}:images`],
  });
});

export const getPersonBase = cache(async (id) =>
  getEntityDetail(id, 'person', {
    append: ['external_ids'],
    revalidate: TMDB_REVALIDATE.DETAIL_BASE,
  })
);

export const getPersonSecondary = cache(async (id) =>
  getEntityDetail(id, 'person', {
    append: ['images', 'movie_credits', 'tagged_images'],
    revalidate: TMDB_REVALIDATE.DETAIL_SECONDARY,
    tags: ['tmdb:person:secondary'],
  })
);

export function mergeDetailData(baseData, secondaryData) {
  return {
    ...(baseData || {}),
    ...(secondaryData || {}),
  };
}
