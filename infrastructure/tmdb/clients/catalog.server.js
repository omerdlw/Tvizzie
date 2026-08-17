import 'server-only';

import { cache } from 'react';

import {
  isTvMediaType,
  normalizeMediaType,
} from '@/domains/media/utils/media-key';
import { sanitizeTvResults } from '@/infrastructure/tmdb/clients/sanitize';

import { TMDB_REVALIDATE } from './tmdb-client-config';
import { tmdbRequest } from './request';
import { withMediaType } from './search-ranking';
import { sanitizeMovieResultsWithRuntime } from './runtime-sanitize.server';

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
