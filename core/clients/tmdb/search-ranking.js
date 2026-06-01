import { isPersonMediaType, isTvMediaType } from '@/core/utils/media';

import { createSearchFallbackQueries } from './search/fallback-queries';
import { buildMovieAuthorityFallbackItems, rankResolvedMovieSearchItems } from './search/movie-ranking';
import { buildPersonAuthorityFallbackItems, rankResolvedPersonSearchItems } from './search/person-ranking';
import {
  dedupeSearchItems,
  normalizeSearchScope,
  paginateSearchItems,
  resolveSearchPageSize,
  resolveSearchRuntimeCheckLimit,
  resolveSearchScanPageLimit,
  withMediaType,
} from './search/shared';

export {
  createSearchFallbackQueries,
  dedupeSearchItems,
  normalizeSearchScope,
  paginateSearchItems,
  resolveSearchPageSize,
  resolveSearchRuntimeCheckLimit,
  resolveSearchScanPageLimit,
  withMediaType,
};

export async function normalizeSearchResults(items = [], query = '', requestedType = 'movie', options = {}) {
  const normalizedType = isPersonMediaType(requestedType) ? 'person' : isTvMediaType(requestedType) ? 'tv' : 'movie';

  return normalizedType === 'person'
    ? rankResolvedPersonSearchItems(items, query, options)
    : await rankResolvedMovieSearchItems(items, query, {
        ...options,
        mediaType: normalizedType,
      });
}

export function buildAuthorityFallbackItems(items = [], type = 'movie', options = {}) {
  const normalizedType = isPersonMediaType(type) ? 'person' : isTvMediaType(type) ? 'tv' : 'movie';

  return normalizedType === 'person'
    ? buildPersonAuthorityFallbackItems(items, options)
    : buildMovieAuthorityFallbackItems(items, { ...options, mediaType: normalizedType });
}
