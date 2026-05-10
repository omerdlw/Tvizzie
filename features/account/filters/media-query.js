import { isSameFilterState, normalizeString, normalizeToken, parseFlagSet, serializeFlagSet } from './shared';
import { DEFAULT_MEDIA_FILTERS, MEDIA_SORT_VALUE_SET } from './media-options';

export function normalizeMediaSort(value) {
  const normalized = normalizeString(value).toLowerCase();
  return MEDIA_SORT_VALUE_SET.has(normalized) ? normalized : DEFAULT_MEDIA_FILTERS.sort;
}

export function parseMediaFilters(searchParams, { allowedEyeFlags = null } = {}) {
  const query = normalizeString(searchParams?.get?.('mq'));
  const decade = normalizeString(searchParams?.get?.('mdec')).toLowerCase() || DEFAULT_MEDIA_FILTERS.decade;
  const genre = normalizeToken(searchParams?.get?.('mgen')) || DEFAULT_MEDIA_FILTERS.genre;
  const sort = normalizeMediaSort(searchParams?.get?.('msort'));
  const parsedEyeFlags = parseFlagSet(searchParams?.get?.('meye'));
  const eyeFlags =
    Array.isArray(allowedEyeFlags) && allowedEyeFlags.length > 0
      ? new Set(
          [...parsedEyeFlags].filter((flag) => {
            return allowedEyeFlags.includes(flag);
          })
        )
      : parsedEyeFlags;

  return {
    decade,
    eyeFlags,
    genre,
    maxRating: DEFAULT_MEDIA_FILTERS.maxRating,
    minRating: DEFAULT_MEDIA_FILTERS.minRating,
    query,
    ratingMode: DEFAULT_MEDIA_FILTERS.ratingMode,
    sort,
  };
}

export function toMediaQueryValues(filters = DEFAULT_MEDIA_FILTERS) {
  const normalizedFilters = {
    ...DEFAULT_MEDIA_FILTERS,
    ...(filters || {}),
  };
  const normalizedQuery = normalizeString(normalizedFilters.query);

  const nextValues = {};

  if (normalizedQuery) {
    nextValues.mq = normalizedQuery;
  }

  if (normalizedFilters.decade !== DEFAULT_MEDIA_FILTERS.decade) {
    nextValues.mdec = normalizedFilters.decade;
  }

  if (normalizedFilters.genre !== DEFAULT_MEDIA_FILTERS.genre) {
    nextValues.mgen = normalizedFilters.genre;
  }

  if (normalizedFilters.sort !== DEFAULT_MEDIA_FILTERS.sort) {
    nextValues.msort = normalizedFilters.sort;
  }

  const serializedFlags = serializeFlagSet(normalizedFilters.eyeFlags);

  if (serializedFlags) {
    nextValues.meye = serializedFlags;
  }

  return nextValues;
}

export function hasActiveMediaFilters(filters = DEFAULT_MEDIA_FILTERS) {
  const normalizedFilters = {
    ...DEFAULT_MEDIA_FILTERS,
    ...(filters || {}),
    query: normalizeString(filters?.query),
  };

  if (!isSameFilterState(normalizedFilters, DEFAULT_MEDIA_FILTERS, ['decade', 'genre', 'query', 'sort'])) {
    return true;
  }

  return normalizedFilters.eyeFlags instanceof Set && normalizedFilters.eyeFlags.size > 0;
}
