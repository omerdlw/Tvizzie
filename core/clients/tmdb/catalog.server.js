import 'server-only';

import { cache } from 'react';

import { normalizeMediaType } from '@/core/utils/media';

import { TMDB_REVALIDATE } from './config';
import { tmdbRequest } from './request';
import { withMediaType } from './search-ranking';
import { sanitizeMovieResultsWithRuntime } from './runtime-sanitize.server';

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
