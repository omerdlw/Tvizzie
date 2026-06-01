import { REVIEW_SORT_MODE, sortReviewsByMode } from '@/features/reviews/utils';

import {
  isSameFilterState,
  matchesRange,
  normalizeFiniteNumber,
  normalizeRatingMode,
  normalizeStarValue,
  normalizeString,
  parseFlagSet,
  serializeFlagSet,
} from './shared';

export const REVIEW_FILTER_QUERY_KEYS = Object.freeze(['rr', 'rmin', 'rmax', 'ryear', 'rsort', 'reye']);

const REVIEW_SORT_VALUE_SET = new Set([
  REVIEW_SORT_MODE.NEWEST,
  REVIEW_SORT_MODE.OLDEST,
  REVIEW_SORT_MODE.RATING_DESC,
  REVIEW_SORT_MODE.RATING_ASC,
  REVIEW_SORT_MODE.LIKES_DESC,
  REVIEW_SORT_MODE.LIKES_ASC,
]);

const DEFAULT_REVIEW_FILTERS = Object.freeze({
  maxRating: 5,
  minRating: 0.5,
  ratingMode: 'any',
  sort: REVIEW_SORT_MODE.NEWEST,
  year: 'all',
});

function normalizeReviewSort(value) {
  const normalized = normalizeString(value).toLowerCase();
  return REVIEW_SORT_VALUE_SET.has(normalized) ? normalized : DEFAULT_REVIEW_FILTERS.sort;
}

function hasContentText(review = {}) {
  return normalizeString(review?.content).length > 0;
}

export function parseReviewFilters(searchParams) {
  const ratingMode = normalizeRatingMode(searchParams?.get?.('rr'), DEFAULT_REVIEW_FILTERS.ratingMode);
  const parsedMin = normalizeStarValue(searchParams?.get?.('rmin'), DEFAULT_REVIEW_FILTERS.minRating);
  const parsedMax = normalizeStarValue(searchParams?.get?.('rmax'), DEFAULT_REVIEW_FILTERS.maxRating);
  const minRating = Math.min(parsedMin, parsedMax);
  const maxRating = Math.max(parsedMin, parsedMax);
  const year = normalizeString(searchParams?.get?.('ryear')).toLowerCase() || DEFAULT_REVIEW_FILTERS.year;
  const sort = normalizeReviewSort(searchParams?.get?.('rsort'));
  const eyeFlags = parseFlagSet(searchParams?.get?.('reye'));

  return {
    eyeFlags,
    maxRating,
    minRating,
    ratingMode,
    sort,
    year,
  };
}

export function toReviewQueryValues(filters = DEFAULT_REVIEW_FILTERS) {
  const normalizedFilters = {
    ...DEFAULT_REVIEW_FILTERS,
    ...(filters || {}),
  };
  const nextValues = {};

  if (normalizedFilters.ratingMode !== DEFAULT_REVIEW_FILTERS.ratingMode) {
    nextValues.rr = normalizedFilters.ratingMode;
  }

  if (
    normalizedFilters.ratingMode === 'range' &&
    normalizedFilters.minRating !== DEFAULT_REVIEW_FILTERS.minRating
  ) {
    nextValues.rmin = String(normalizedFilters.minRating);
  }

  if (
    normalizedFilters.ratingMode === 'range' &&
    normalizedFilters.maxRating !== DEFAULT_REVIEW_FILTERS.maxRating
  ) {
    nextValues.rmax = String(normalizedFilters.maxRating);
  }

  if (normalizedFilters.year !== DEFAULT_REVIEW_FILTERS.year) {
    nextValues.ryear = normalizedFilters.year;
  }

  if (normalizedFilters.sort !== DEFAULT_REVIEW_FILTERS.sort) {
    nextValues.rsort = normalizedFilters.sort;
  }

  const serializedFlags = serializeFlagSet(normalizedFilters.eyeFlags);

  if (serializedFlags) {
    nextValues.reye = serializedFlags;
  }

  return nextValues;
}

export function hasActiveReviewFilters(filters = DEFAULT_REVIEW_FILTERS) {
  const normalizedFilters = {
    ...DEFAULT_REVIEW_FILTERS,
    ...(filters || {}),
  };

  if (!isSameFilterState(normalizedFilters, DEFAULT_REVIEW_FILTERS, ['ratingMode', 'sort', 'year'])) {
    return true;
  }

  if (normalizedFilters.ratingMode === 'range') {
    if (normalizedFilters.minRating !== DEFAULT_REVIEW_FILTERS.minRating) {
      return true;
    }

    if (normalizedFilters.maxRating !== DEFAULT_REVIEW_FILTERS.maxRating) {
      return true;
    }
  }

  return normalizedFilters.eyeFlags instanceof Set && normalizedFilters.eyeFlags.size > 0;
}

export function applyReviewFilters(items = [], filters = DEFAULT_REVIEW_FILTERS) {
  const sourceItems = Array.isArray(items) ? items : [];
  const normalizedFilters = {
    ...DEFAULT_REVIEW_FILTERS,
    ...(filters || {}),
  };

  const filteredItems = sourceItems.filter((item) => {
    const ratingValue = normalizeFiniteNumber(item?.rating, null);

    if (normalizedFilters.ratingMode === 'none' && ratingValue !== null) {
      return false;
    }

    if (
      normalizedFilters.ratingMode === 'range' &&
      !matchesRange(ratingValue, normalizedFilters.minRating, normalizedFilters.maxRating)
    ) {
      return false;
    }

    if (normalizedFilters.year !== 'all') {
      const targetYear = Number.parseInt(normalizedFilters.year, 10);
      const itemTime = new Date(item?.updatedAt || item?.createdAt || 0).getTime();
      const itemYear = Number.isFinite(itemTime) ? new Date(itemTime).getUTCFullYear() : null;

      if (!Number.isFinite(targetYear) || !Number.isFinite(itemYear) || itemYear !== targetYear) {
        return false;
      }
    }

    const eyeFlags = normalizedFilters.eyeFlags;
    const contentPresent = hasContentText(item);

    if (eyeFlags.has('hide_ratings_only') && !contentPresent) {
      return false;
    }

    if (eyeFlags.has('hide_text_reviews') && contentPresent) {
      return false;
    }

    return true;
  });

  return sortReviewsByMode(filteredItems, normalizedFilters.sort);
}

export function collectReviewYears(items = []) {
  const years = new Set();

  (Array.isArray(items) ? items : []).forEach((item) => {
    const itemTime = new Date(item?.updatedAt || item?.createdAt || 0).getTime();

    if (Number.isFinite(itemTime)) {
      years.add(new Date(itemTime).getUTCFullYear());
    }
  });

  return [
    { label: 'Any year', value: 'all' },
    ...[...years]
      .sort((left, right) => right - left)
      .map((year) => ({
        label: String(year),
        value: String(year),
      })),
  ];
}
