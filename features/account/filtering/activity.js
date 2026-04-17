import {
  isSameFilterState,
  matchesRange,
  normalizeFiniteNumber,
  normalizeRatingMode,
  normalizeStarValue,
  normalizeString,
  normalizeToken,
  parseFlagSet,
} from './shared';

export const ACTIVITY_FILTER_QUERY_KEYS = Object.freeze(['aevt', 'asub', 'asort', 'ar', 'amin', 'amax', 'aeye']);

const ACTIVITY_SORT_VALUE_SET = new Set(['newest', 'oldest']);

const DEFAULT_ACTIVITY_FILTERS = Object.freeze({
  event: 'all',
  maxRating: 5,
  minRating: 0.5,
  ratingMode: 'any',
  sort: 'newest',
  subject: 'all',
});

const ACTIVITY_SUBJECT_LABELS = Object.freeze({
  all: 'Any content',
  list: 'Lists',
  movie: 'Films',
  other: 'Other',
  user: 'People',
});

function normalizeActivitySort(value) {
  const normalized = normalizeString(value).toLowerCase();
  return ACTIVITY_SORT_VALUE_SET.has(normalized) ? normalized : DEFAULT_ACTIVITY_FILTERS.sort;
}

function resolveActivityEventToken(item = {}) {
  return normalizeToken(item?.eventType);
}

function resolveActivitySubjectToken(item = {}) {
  const subjectType = normalizeToken(item?.subject?.type);

  if (subjectType === 'movie' || subjectType === 'film') {
    return 'movie';
  }

  if (subjectType === 'list') {
    return 'list';
  }

  if (subjectType === 'user' || subjectType === 'profile' || subjectType === 'account') {
    return 'user';
  }

  return subjectType || 'other';
}

function resolveActivityTimestamp(item = {}) {
  const value = item?.updatedAt || item?.createdAt || null;

  if (!value) {
    return 0;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveActivityRating(item = {}) {
  const directRating = normalizeFiniteNumber(item?.activityState?.rating, null);

  if (Number.isFinite(directRating)) {
    return directRating;
  }

  const payloadRating = normalizeFiniteNumber(item?.payload?.rating, null);

  if (Number.isFinite(payloadRating)) {
    return payloadRating;
  }

  return normalizeFiniteNumber(item?.rating, null);
}

function resolveActivityNormalizedEventToken(item = {}) {
  const eventToken = resolveActivityEventToken(item);
  const subjectToken = resolveActivitySubjectToken(item);

  if (eventToken === 'list_liked' && subjectToken === 'movie') {
    return 'movie_liked';
  }

  return eventToken;
}

export function parseActivityFilters(searchParams) {
  const ratingMode = normalizeRatingMode(searchParams?.get?.('ar'), DEFAULT_ACTIVITY_FILTERS.ratingMode);
  const parsedMin = normalizeStarValue(searchParams?.get?.('amin'), DEFAULT_ACTIVITY_FILTERS.minRating);
  const parsedMax = normalizeStarValue(searchParams?.get?.('amax'), DEFAULT_ACTIVITY_FILTERS.maxRating);
  const minRating = Math.min(parsedMin, parsedMax);
  const maxRating = Math.max(parsedMin, parsedMax);
  const sort = normalizeActivitySort(searchParams?.get?.('asort'));
  const event = normalizeToken(searchParams?.get?.('aevt')) || DEFAULT_ACTIVITY_FILTERS.event;
  const subject = normalizeToken(searchParams?.get?.('asub')) || DEFAULT_ACTIVITY_FILTERS.subject;
  const eyeFlags = parseFlagSet(searchParams?.get?.('aeye'));

  return {
    event,
    eyeFlags,
    maxRating,
    minRating,
    ratingMode,
    sort,
    subject,
  };
}

export function toActivityQueryValues(filters = DEFAULT_ACTIVITY_FILTERS) {
  const normalizedFilters = {
    ...DEFAULT_ACTIVITY_FILTERS,
    ...(filters || {}),
  };

  const nextValues = {};

  if (normalizedFilters.subject !== DEFAULT_ACTIVITY_FILTERS.subject) {
    nextValues.asub = normalizeToken(normalizedFilters.subject);
  }

  if (normalizedFilters.sort !== DEFAULT_ACTIVITY_FILTERS.sort) {
    nextValues.asort = normalizedFilters.sort;
  }

  return nextValues;
}

export function hasActiveActivityFilters(filters = DEFAULT_ACTIVITY_FILTERS) {
  const normalizedFilters = {
    ...DEFAULT_ACTIVITY_FILTERS,
    ...(filters || {}),
  };

  return !isSameFilterState(normalizedFilters, DEFAULT_ACTIVITY_FILTERS, ['sort', 'subject']);
}

export function collectActivitySubjectOptions() {
  return [
    { label: ACTIVITY_SUBJECT_LABELS.all, value: 'all' },
    { label: ACTIVITY_SUBJECT_LABELS.movie, value: 'movie' },
    { label: ACTIVITY_SUBJECT_LABELS.list, value: 'list' },
  ];
}

export function getActivitySubjectOptionValues(options = []) {
  return new Set(
    (Array.isArray(options) ? options : [])
      .map((option) => normalizeToken(option?.value))
      .filter((value) => value && value !== 'all')
  );
}

export function applyActivityFilters(items = [], filters = DEFAULT_ACTIVITY_FILTERS) {
  const sourceItems = Array.isArray(items) ? items : [];
  const normalizedFilters = {
    ...DEFAULT_ACTIVITY_FILTERS,
    ...(filters || {}),
  };

  const filteredItems = sourceItems.filter((item) => {
    const eventToken = resolveActivityNormalizedEventToken(item);
    const subjectToken = resolveActivitySubjectToken(item);
    const rating = resolveActivityRating(item);

    if (normalizedFilters.event !== 'all' && eventToken !== normalizedFilters.event) {
      return false;
    }

    if (normalizedFilters.subject !== 'all' && subjectToken !== normalizedFilters.subject) {
      return false;
    }

    if (normalizedFilters.ratingMode === 'none' && rating !== null) {
      return false;
    }

    if (
      normalizedFilters.ratingMode === 'range' &&
      !matchesRange(rating, normalizedFilters.minRating, normalizedFilters.maxRating)
    ) {
      return false;
    }

    const eyeFlags = normalizedFilters.eyeFlags;

    if (eyeFlags.has('hide_watchlist_events') && eventToken === 'watchlist_added') {
      return false;
    }

    if (eyeFlags.has('hide_rewatch_events') && item?.activityState?.isRewatch) {
      return false;
    }

    if (eyeFlags.has('hide_without_rating') && !Number.isFinite(rating)) {
      return false;
    }

    if (eyeFlags.has('hide_without_poster') && !normalizeString(item?.subject?.poster)) {
      return false;
    }

    return true;
  });

  return [...filteredItems].sort((left, right) => {
    const diff = resolveActivityTimestamp(right) - resolveActivityTimestamp(left);

    if (normalizedFilters.sort === 'oldest') {
      return -diff;
    }

    return diff;
  });
}
