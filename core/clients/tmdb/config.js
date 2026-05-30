export const TMDB_FETCH_TIMEOUT_MS = 4500;

export const TMDB_HEADERS = Object.freeze({
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

export const SEARCH_PAGE_SIZE = 20;
export const SEARCH_SCAN_CONCURRENCY = 6;
export const SEARCH_MIN_MOVIE_VOTE_COUNT = 100;
export const SEARCH_MIN_MOVIE_VOTE_AVERAGE = 4;
export const SEARCH_MIN_MOVIE_RUNTIME = 40;

export const SEARCH_RUNTIME_CHECK_LIMITS = Object.freeze({
  full: 24,
  preview: 4,
});

export const SEARCH_SCAN_PAGE_LIMITS = Object.freeze({
  full: Object.freeze({
    long: 14,
    medium: 14,
    short: 16,
  }),
  preview: Object.freeze({
    long: 5,
    medium: 8,
    short: 10,
  }),
});
