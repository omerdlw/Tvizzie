import { buildMediaItemKey } from '@/core/services/shared/media-key.service';
import { REVIEW_SORT_MODE, sortReviewsByMode } from '@/features/reviews/utils';
export {
  buildCollectionBasePath,
  buildManagedQueryString,
  parsePageFromSearch,
  normalizePage,
} from './filtering/query-utils';
export { getStarStepValues } from './filtering/shared';
export {
  ACTIVITY_FILTER_QUERY_KEYS,
  applyActivityFilters,
  collectActivitySubjectOptions,
  getActivitySubjectOptionValues,
  hasActiveActivityFilters,
  parseActivityFilters,
  toActivityQueryValues,
} from './filtering/activity';
import {
  buildHash,
  isSameFilterState,
  matchesRange,
  normalizeFiniteNumber,
  normalizeRatingMode,
  normalizeStarValue,
  normalizeString,
  normalizeToken,
  parseFlagSet,
  serializeFlagSet,
} from './filtering/shared';

export const MEDIA_FILTER_QUERY_KEYS = Object.freeze(['mq', 'mr', 'mmin', 'mmax', 'mdec', 'mgen', 'msort', 'meye']);
export const REVIEW_FILTER_QUERY_KEYS = Object.freeze(['rr', 'rmin', 'rmax', 'ryear', 'rsort', 'reye']);
export const LIST_FILTER_QUERY_KEYS = Object.freeze(['lsort']);

export const MEDIA_SORT_GROUPS = Object.freeze([
  Object.freeze({
    label: 'Release Date',
    options: Object.freeze([
      Object.freeze({ label: 'Newest release first', value: 'release_desc' }),
      Object.freeze({ label: 'Earliest release first', value: 'release_asc' }),
    ]),
  }),
  Object.freeze({
    label: 'When Added',
    options: Object.freeze([
      Object.freeze({ label: 'Recently added first', value: 'added_desc' }),
      Object.freeze({ label: 'Oldest added first', value: 'added_asc' }),
    ]),
  }),
  Object.freeze({
    label: 'Average Rating',
    options: Object.freeze([
      Object.freeze({ label: 'Highest TMDB rating first', value: 'average_desc' }),
      Object.freeze({ label: 'Lowest TMDB rating first', value: 'average_asc' }),
    ]),
  }),
  Object.freeze({
    label: 'Title',
    options: Object.freeze([
      Object.freeze({ label: 'Title A to Z', value: 'title_asc' }),
      Object.freeze({ label: 'Title Z to A', value: 'title_desc' }),
    ]),
  }),
  Object.freeze({
    label: 'Other',
    options: Object.freeze([
      Object.freeze({ label: 'Highest popularity first', value: 'popularity_desc' }),
      Object.freeze({ label: 'Shuffle order', value: 'shuffle' }),
    ]),
  }),
]);

const MEDIA_SORT_VALUE_SET = new Set(MEDIA_SORT_GROUPS.flatMap((group) => group.options.map((option) => option.value)));

export const LIST_SORT_OPTIONS = Object.freeze([
  Object.freeze({ label: 'Recently Updated', value: 'updated_desc' }),
  Object.freeze({ label: 'Recently Created', value: 'created_desc' }),
  Object.freeze({ label: 'Oldest Created', value: 'created_asc' }),
  Object.freeze({ label: 'Most Liked', value: 'likes_desc' }),
  Object.freeze({ label: 'Most Reviewed', value: 'reviews_desc' }),
  Object.freeze({ label: 'Most Items', value: 'items_desc' }),
  Object.freeze({ label: 'Title (A-Z)', value: 'title_asc' }),
  Object.freeze({ label: 'Title (Z-A)', value: 'title_desc' }),
]);

const LIST_SORT_VALUE_SET = new Set(LIST_SORT_OPTIONS.map((option) => option.value));

const REVIEW_SORT_VALUE_SET = new Set([
  REVIEW_SORT_MODE.NEWEST,
  REVIEW_SORT_MODE.OLDEST,
  REVIEW_SORT_MODE.RATING_DESC,
  REVIEW_SORT_MODE.RATING_ASC,
  REVIEW_SORT_MODE.LIKES_DESC,
  REVIEW_SORT_MODE.LIKES_ASC,
]);

const BASE_GENRE_OPTIONS = Object.freeze([
  Object.freeze({ label: 'Action', value: 'action' }),
  Object.freeze({ label: 'Adventure', value: 'adventure' }),
  Object.freeze({ label: 'Animation', value: 'animation' }),
  Object.freeze({ label: 'Comedy', value: 'comedy' }),
  Object.freeze({ label: 'Crime', value: 'crime' }),
  Object.freeze({ label: 'Documentary', value: 'documentary' }),
  Object.freeze({ label: 'Drama', value: 'drama' }),
  Object.freeze({ label: 'Family', value: 'family' }),
  Object.freeze({ label: 'Fantasy', value: 'fantasy' }),
  Object.freeze({ label: 'History', value: 'history' }),
  Object.freeze({ label: 'Horror', value: 'horror' }),
  Object.freeze({ label: 'Music', value: 'music' }),
  Object.freeze({ label: 'Mystery', value: 'mystery' }),
  Object.freeze({ label: 'Romance', value: 'romance' }),
  Object.freeze({ label: 'Science Fiction', value: 'science_fiction' }),
  Object.freeze({ label: 'TV Movie', value: 'tv_movie' }),
  Object.freeze({ label: 'Thriller', value: 'thriller' }),
  Object.freeze({ label: 'War', value: 'war' }),
  Object.freeze({ label: 'Western', value: 'western' }),
]);

const TMDB_GENRE_ID_TO_VALUE = Object.freeze({
  12: 'adventure',
  14: 'fantasy',
  16: 'animation',
  18: 'drama',
  27: 'horror',
  28: 'action',
  35: 'comedy',
  36: 'history',
  37: 'western',
  53: 'thriller',
  80: 'crime',
  99: 'documentary',
  10402: 'music',
  10749: 'romance',
  10751: 'family',
  10752: 'war',
  10770: 'tv_movie',
  878: 'science_fiction',
  9648: 'mystery',
});

const GENRE_VALUE_TO_LABEL = Object.freeze(
  BASE_GENRE_OPTIONS.reduce((accumulator, option) => {
    accumulator[option.value] = option.label;
    return accumulator;
  }, {})
);

const GENRE_LABEL_TO_VALUE = Object.freeze(
  Object.entries(GENRE_VALUE_TO_LABEL).reduce((accumulator, [value, label]) => {
    accumulator[normalizeToken(label)] = value;
    return accumulator;
  }, {})
);

const DEFAULT_MEDIA_FILTERS = Object.freeze({
  decade: 'all',
  genre: 'all',
  maxRating: 5,
  minRating: 0.5,
  query: '',
  ratingMode: 'any',
  sort: 'release_desc',
});

const DEFAULT_REVIEW_FILTERS = Object.freeze({
  maxRating: 5,
  minRating: 0.5,
  ratingMode: 'any',
  sort: REVIEW_SORT_MODE.NEWEST,
  year: 'all',
});

const DEFAULT_LIST_FILTERS = Object.freeze({
  sort: 'updated_desc',
});

function normalizeMediaSort(value) {
  const normalized = normalizeString(value).toLowerCase();
  return MEDIA_SORT_VALUE_SET.has(normalized) ? normalized : DEFAULT_MEDIA_FILTERS.sort;
}

function normalizeReviewSort(value) {
  const normalized = normalizeString(value).toLowerCase();
  return REVIEW_SORT_VALUE_SET.has(normalized) ? normalized : DEFAULT_REVIEW_FILTERS.sort;
}

function normalizeListSort(value) {
  const normalized = normalizeString(value).toLowerCase();
  return LIST_SORT_VALUE_SET.has(normalized) ? normalized : DEFAULT_LIST_FILTERS.sort;
}

function toMediaKey(item = {}) {
  if (item?.mediaKey) {
    return String(item.mediaKey);
  }

  const entityType = normalizeString(item?.entityType || item?.media_type || item?.subject?.type).toLowerCase();
  const entityId = normalizeString(item?.entityId || item?.id || item?.subject?.id);

  if (!entityType || !entityId) {
    return '';
  }

  return buildMediaItemKey(entityType, entityId);
}

function resolveMediaTitle(item = {}) {
  return item?.title || item?.name || item?.original_title || item?.original_name || 'Untitled';
}

function resolveReleaseDate(item = {}) {
  return item?.release_date || item?.first_air_date || null;
}

function resolveReleaseYear(item = {}) {
  const rawValue = resolveReleaseDate(item);

  if (!rawValue) {
    return null;
  }

  const dateValue = new Date(rawValue).getTime();

  if (!Number.isFinite(dateValue)) {
    const numericYear = Number.parseInt(String(rawValue).slice(0, 4), 10);
    return Number.isFinite(numericYear) ? numericYear : null;
  }

  return new Date(dateValue).getUTCFullYear();
}

function resolveReleaseTime(item = {}) {
  const rawValue = resolveReleaseDate(item);

  if (!rawValue) {
    return 0;
  }

  const timeValue = new Date(rawValue).getTime();
  return Number.isFinite(timeValue) ? timeValue : 0;
}

function resolveAddedTime(item = {}) {
  const rawValue = item?.addedAt || item?.updatedAt || null;

  if (!rawValue) {
    return 0;
  }

  const timeValue = new Date(rawValue).getTime();
  return Number.isFinite(timeValue) ? timeValue : 0;
}

function resolveAverageRating(item = {}) {
  const raw = normalizeFiniteNumber(item?.vote_average, null);

  if (!Number.isFinite(raw) || raw <= 0) {
    return null;
  }

  return raw;
}

function resolvePopularity(item = {}) {
  const popularity = normalizeFiniteNumber(item?.popularity, null);

  if (Number.isFinite(popularity)) {
    return popularity;
  }

  const voteCount = normalizeFiniteNumber(item?.vote_count, null);
  const rating = resolveAverageRating(item);

  if (!Number.isFinite(voteCount) && rating === null) {
    return 0;
  }

  return (Number.isFinite(voteCount) ? voteCount : 0) + (rating !== null ? rating * 50 : 0);
}

function resolveUserRating(item = {}) {
  const rating = normalizeFiniteNumber(item?.rating ?? item?.userRating, null);
  return Number.isFinite(rating) ? rating : null;
}

function resolveGenreValueFromRaw(rawValue) {
  if (rawValue === null || rawValue === undefined) {
    return null;
  }

  const asNumber = normalizeFiniteNumber(rawValue, null);

  if (Number.isFinite(asNumber) && TMDB_GENRE_ID_TO_VALUE[asNumber]) {
    return TMDB_GENRE_ID_TO_VALUE[asNumber];
  }

  const token = normalizeToken(rawValue);

  if (!token) {
    return null;
  }

  if (GENRE_VALUE_TO_LABEL[token]) {
    return token;
  }

  return GENRE_LABEL_TO_VALUE[token] || token;
}

function collectGenreValues(item = {}) {
  const values = new Set();
  const append = (entry) => {
    const normalized = resolveGenreValueFromRaw(entry);

    if (!normalized) {
      return;
    }

    values.add(normalized);
  };

  const genreIdSources = [item?.genre_ids, item?.genreIds, item?.payload?.genre_ids, item?.payload?.genreIds];
  genreIdSources.forEach((source) => {
    if (!Array.isArray(source)) {
      return;
    }

    source.forEach((genreId) => append(genreId));
  });

  const genreSources = [
    item?.genres,
    item?.genreNames,
    item?.genre_names,
    item?.payload?.genres,
    item?.payload?.genreNames,
    item?.payload?.genre_names,
  ];
  genreSources.forEach((source) => {
    if (!Array.isArray(source)) {
      return;
    }

    source.forEach((genre) => {
      if (genre && typeof genre === 'object') {
        append(genre.id);
        append(genre.name);
        return;
      }

      append(genre);
    });
  });

  return values;
}

function collectServiceValues(item = {}) {
  const values = new Set();
  const append = (entry) => {
    if (!entry) {
      return;
    }

    if (typeof entry === 'string') {
      const token = normalizeToken(entry);

      if (token) {
        values.add(token);
      }

      return;
    }

    if (typeof entry === 'number') {
      values.add(String(entry));
      return;
    }

    if (typeof entry === 'object') {
      const nameToken = normalizeToken(entry.provider_name || entry.name || entry.title);
      const idToken = normalizeString(entry.provider_id || entry.id);

      if (nameToken) {
        values.add(nameToken);
      }

      if (idToken) {
        values.add(idToken);
      }
    }
  };

  const directArraySources = [
    item?.providerNames,
    item?.providerIds,
    item?.providers,
    item?.payload?.providerNames,
    item?.payload?.providerIds,
    item?.payload?.providers,
  ];

  directArraySources.forEach((source) => {
    if (!Array.isArray(source)) {
      return;
    }

    source.forEach((entry) => append(entry));
  });

  const providerMap = item?.watchProviders || item?.payload?.watchProviders || null;

  if (providerMap && typeof providerMap === 'object') {
    Object.values(providerMap).forEach((regionProviders) => {
      if (!regionProviders || typeof regionProviders !== 'object') {
        return;
      }

      Object.values(regionProviders).forEach((providerList) => {
        if (!Array.isArray(providerList)) {
          return;
        }

        providerList.forEach((provider) => append(provider));
      });
    });
  }

  return values;
}

function hasContentText(review = {}) {
  return normalizeString(review?.content).length > 0;
}

export function buildMediaKeySet(items = []) {
  return new Set((Array.isArray(items) ? items : []).map((item) => toMediaKey(item)).filter(Boolean));
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

export function applyMediaFilters(items = [], filters = DEFAULT_MEDIA_FILTERS, context = {}) {
  const sourceItems = Array.isArray(items) ? items : [];
  const normalizedFilters = {
    ...DEFAULT_MEDIA_FILTERS,
    ...(filters || {}),
  };
  const normalizedQuery = normalizeString(normalizedFilters.query).toLocaleLowerCase();
  const watchedKeys = context.watchedKeys instanceof Set ? context.watchedKeys : new Set();
  const likedKeys = context.likedKeys instanceof Set ? context.likedKeys : new Set();
  const reviewedKeys = context.reviewedKeys instanceof Set ? context.reviewedKeys : new Set();
  const watchlistKeys = context.watchlistKeys instanceof Set ? context.watchlistKeys : new Set();
  const hasGenreMetadata = sourceItems.some((item) => collectGenreValues(item).size > 0);

  const filteredItems = sourceItems.filter((item) => {
    const mediaKey = toMediaKey(item);
    const title = resolveMediaTitle(item).toLocaleLowerCase();

    if (normalizedQuery && !title.includes(normalizedQuery)) {
      return false;
    }

    if (normalizedFilters.decade !== 'all') {
      const decadeValue = Number.parseInt(normalizedFilters.decade, 10);
      const releaseYear = resolveReleaseYear(item);

      if (
        !Number.isFinite(decadeValue) ||
        !Number.isFinite(releaseYear) ||
        releaseYear < decadeValue ||
        releaseYear >= decadeValue + 10
      ) {
        return false;
      }
    }

    if (normalizedFilters.genre !== 'all' && hasGenreMetadata) {
      const genreValues = collectGenreValues(item);

      if (!genreValues.has(normalizedFilters.genre)) {
        return false;
      }
    }

    const eyeFlags = normalizedFilters.eyeFlags;

    if (eyeFlags.has('hide_watched') && watchedKeys.has(mediaKey)) {
      return false;
    }

    if (eyeFlags.has('hide_liked') && likedKeys.has(mediaKey)) {
      return false;
    }

    if (eyeFlags.has('hide_reviewed') && reviewedKeys.has(mediaKey)) {
      return false;
    }

    if (eyeFlags.has('hide_watchlist') && watchlistKeys.has(mediaKey)) {
      return false;
    }

    if (eyeFlags.has('hide_rewatched') && Number(item?.watchCount || 0) > 1) {
      return false;
    }

    if (eyeFlags.has('hide_rated') && resolveUserRating(item) !== null) {
      return false;
    }

    if (eyeFlags.has('hide_unreleased')) {
      const releaseDate = resolveReleaseDate(item);

      if (releaseDate) {
        const releaseTime = new Date(releaseDate).getTime();

        if (Number.isFinite(releaseTime) && releaseTime > Date.now()) {
          return false;
        }
      }
    }

    if (eyeFlags.has('hide_documentaries') && collectGenreValues(item).has('documentary')) {
      return false;
    }

    return true;
  });

  return sortMediaItems(filteredItems, normalizedFilters.sort);
}

function sortMediaItems(items = [], sort = DEFAULT_MEDIA_FILTERS.sort) {
  const decorated = items.map((item, index) => ({
    averageRating: resolveAverageRating(item),
    index,
    item,
    title: resolveMediaTitle(item).toLocaleLowerCase(),
  }));

  decorated.sort((left, right) => {
    switch (sort) {
      case 'release_asc': {
        const diff = resolveReleaseTime(left.item) - resolveReleaseTime(right.item);
        if (diff !== 0) return diff;
        break;
      }
      case 'added_desc': {
        const diff = resolveAddedTime(right.item) - resolveAddedTime(left.item);
        if (diff !== 0) return diff;
        break;
      }
      case 'added_asc': {
        const diff = resolveAddedTime(left.item) - resolveAddedTime(right.item);
        if (diff !== 0) return diff;
        break;
      }
      case 'average_desc': {
        const leftRating = left.averageRating === null ? -1 : left.averageRating;
        const rightRating = right.averageRating === null ? -1 : right.averageRating;
        const diff = rightRating - leftRating;
        if (diff !== 0) return diff;
        break;
      }
      case 'average_asc': {
        const leftRating = left.averageRating === null ? 10 : left.averageRating;
        const rightRating = right.averageRating === null ? 10 : right.averageRating;
        const diff = leftRating - rightRating;
        if (diff !== 0) return diff;
        break;
      }
      case 'title_asc': {
        const diff = left.title.localeCompare(right.title);
        if (diff !== 0) return diff;
        break;
      }
      case 'title_desc': {
        const diff = right.title.localeCompare(left.title);
        if (diff !== 0) return diff;
        break;
      }
      case 'popularity_desc': {
        const diff = resolvePopularity(right.item) - resolvePopularity(left.item);
        if (diff !== 0) return diff;
        break;
      }
      case 'shuffle': {
        const leftHash = buildHash(toMediaKey(left.item) || String(left.index));
        const rightHash = buildHash(toMediaKey(right.item) || String(right.index));
        const diff = leftHash - rightHash;
        if (diff !== 0) return diff;
        break;
      }
      case 'release_desc':
      default: {
        const diff = resolveReleaseTime(right.item) - resolveReleaseTime(left.item);
        if (diff !== 0) return diff;
        break;
      }
    }

    if (left.title !== right.title) {
      return left.title.localeCompare(right.title);
    }

    return left.index - right.index;
  });

  return decorated.map((entry) => entry.item);
}

export function collectMediaGenreOptions(items = []) {
  const discovered = new Set();

  (Array.isArray(items) ? items : []).forEach((item) => {
    collectGenreValues(item).forEach((genreValue) => discovered.add(genreValue));
  });

  if (discovered.size === 0) {
    return [{ label: 'Any genre', value: 'all' }];
  }

  const options = [...discovered]
    .filter(Boolean)
    .map((value) => ({
      label: GENRE_VALUE_TO_LABEL[value] || value.replace(/_/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase()),
      value,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));

  return [{ label: 'Any genre', value: 'all' }, ...options];
}

export function getAllMediaGenreOptions() {
  return [{ label: 'Any genre', value: 'all' }, ...BASE_GENRE_OPTIONS];
}

export function resolveMediaSortOption(value) {
  for (const group of MEDIA_SORT_GROUPS) {
    const option = group.options.find((entry) => entry.value === value);

    if (option) {
      return {
        ...option,
        groupLabel: group.label,
      };
    }
  }

  return null;
}

export function collectMediaServiceOptions(items = []) {
  const labels = new Map();

  (Array.isArray(items) ? items : []).forEach((item) => {
    collectServiceValues(item).forEach((serviceValue) => {
      if (!serviceValue || labels.has(serviceValue)) {
        return;
      }

      labels.set(
        serviceValue,
        serviceValue.replace(/_/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase())
      );
    });
  });

  const options = [...labels.entries()]
    .map(([value, label]) => ({
      label,
      value,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));

  return [{ label: 'Any service', value: 'all' }, ...options];
}

export function getDecadeOptions(minDecade = 1870) {
  const currentYear = new Date().getUTCFullYear();
  const currentDecade = currentYear - (currentYear % 10);
  const options = [];

  for (let decade = currentDecade; decade >= minDecade; decade -= 10) {
    options.push({
      label: `${decade}s`,
      value: String(decade),
    });
  }

  return [{ label: 'Any decade', value: 'all' }, ...options];
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

  if (normalizedFilters.minRating !== DEFAULT_REVIEW_FILTERS.minRating) {
    nextValues.rmin = String(normalizedFilters.minRating);
  }

  if (normalizedFilters.maxRating !== DEFAULT_REVIEW_FILTERS.maxRating) {
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

  if (normalizedFilters.minRating !== DEFAULT_REVIEW_FILTERS.minRating) {
    return true;
  }

  if (normalizedFilters.maxRating !== DEFAULT_REVIEW_FILTERS.maxRating) {
    return true;
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

    if (!Number.isFinite(itemTime)) {
      return;
    }

    years.add(new Date(itemTime).getUTCFullYear());
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

export function parseListFilters(searchParams) {
  return {
    sort: normalizeListSort(searchParams?.get?.('lsort')),
  };
}

export function toListQueryValues(filters = DEFAULT_LIST_FILTERS) {
  const normalizedFilters = {
    ...DEFAULT_LIST_FILTERS,
    ...(filters || {}),
  };

  if (normalizedFilters.sort === DEFAULT_LIST_FILTERS.sort) {
    return {};
  }

  return {
    lsort: normalizedFilters.sort,
  };
}

export function hasActiveListFilters(filters = DEFAULT_LIST_FILTERS) {
  return normalizeListSort(filters?.sort) !== DEFAULT_LIST_FILTERS.sort;
}

export function sortProfileLists(items = [], sort = DEFAULT_LIST_FILTERS.sort) {
  const sourceItems = Array.isArray(items) ? items : [];

  return [...sourceItems].sort((left, right) => {
    const leftUpdatedAt = new Date(left?.updatedAt || 0).getTime();
    const rightUpdatedAt = new Date(right?.updatedAt || 0).getTime();
    const leftCreatedAt = new Date(left?.createdAt || 0).getTime();
    const rightCreatedAt = new Date(right?.createdAt || 0).getTime();
    const leftTitle = normalizeString(left?.title).toLocaleLowerCase();
    const rightTitle = normalizeString(right?.title).toLocaleLowerCase();
    const leftLikes = Number(left?.likesCount || 0);
    const rightLikes = Number(right?.likesCount || 0);
    const leftReviews = Number(left?.reviewsCount || 0);
    const rightReviews = Number(right?.reviewsCount || 0);
    const leftItemsCount = Number(left?.itemsCount || 0);
    const rightItemsCount = Number(right?.itemsCount || 0);

    switch (sort) {
      case 'created_desc':
        return rightCreatedAt - leftCreatedAt || rightUpdatedAt - leftUpdatedAt || leftTitle.localeCompare(rightTitle);
      case 'created_asc':
        return leftCreatedAt - rightCreatedAt || rightUpdatedAt - leftUpdatedAt || leftTitle.localeCompare(rightTitle);
      case 'likes_desc':
        return rightLikes - leftLikes || rightUpdatedAt - leftUpdatedAt || leftTitle.localeCompare(rightTitle);
      case 'reviews_desc':
        return rightReviews - leftReviews || rightUpdatedAt - leftUpdatedAt || leftTitle.localeCompare(rightTitle);
      case 'items_desc':
        return (
          rightItemsCount - leftItemsCount || rightUpdatedAt - leftUpdatedAt || leftTitle.localeCompare(rightTitle)
        );
      case 'title_asc':
        return leftTitle.localeCompare(rightTitle) || rightUpdatedAt - leftUpdatedAt;
      case 'title_desc':
        return rightTitle.localeCompare(leftTitle) || rightUpdatedAt - leftUpdatedAt;
      case 'updated_desc':
      default:
        return rightUpdatedAt - leftUpdatedAt || rightCreatedAt - leftCreatedAt || leftTitle.localeCompare(rightTitle);
    }
  });
}
