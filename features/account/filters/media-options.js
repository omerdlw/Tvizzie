import { normalizeToken } from './shared';

export const MEDIA_FILTER_QUERY_KEYS = Object.freeze(['mq', 'mr', 'mmin', 'mmax', 'mdec', 'mgen', 'msort', 'meye']);

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

export const MEDIA_SORT_VALUE_SET = new Set(MEDIA_SORT_GROUPS.flatMap((group) => group.options.map((option) => option.value)));

export const BASE_GENRE_OPTIONS = Object.freeze([
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

export const TMDB_GENRE_ID_TO_VALUE = Object.freeze({
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

export const GENRE_VALUE_TO_LABEL = Object.freeze(
  BASE_GENRE_OPTIONS.reduce((accumulator, option) => {
    accumulator[option.value] = option.label;
    return accumulator;
  }, {})
);

export const GENRE_LABEL_TO_VALUE = Object.freeze(
  Object.entries(GENRE_VALUE_TO_LABEL).reduce((accumulator, [value, label]) => {
    accumulator[normalizeToken(label)] = value;
    return accumulator;
  }, {})
);

export const DEFAULT_MEDIA_FILTERS = Object.freeze({
  decade: 'all',
  genre: 'all',
  maxRating: 5,
  minRating: 0.5,
  query: '',
  ratingMode: 'any',
  sort: 'release_desc',
});
