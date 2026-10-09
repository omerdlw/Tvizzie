export const TMDB_API_BASE_URL = "https://api.themoviedb.org/3";
export const TMDB_WEBSITE_URL = "https://www.themoviedb.org";
export const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

export const TMDB_DEFAULT_LANGUAGE = "en-US";

export const TMDB_TIMEOUT_MS = 8_000;
export const TMDB_AWARDS_TIMEOUT_MS = 10_000;

export interface TmdbRetryPolicy {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  maxRetryAfterMs: number;
}

export const TMDB_RETRY: Readonly<TmdbRetryPolicy> = Object.freeze({
  maxRetries: 2,
  baseDelayMs: 250,
  maxDelayMs: 2_000,
  maxRetryAfterMs: 5_000,
});

export const TMDB_REVALIDATE = Object.freeze({
  movie: 60 * 60 * 6,
  person: 60 * 60 * 6,
  awards: 60 * 60 * 24,
  search: 60 * 60,
  feed: 60 * 30,
});

export const TMDB_SEARCH_LIMITS = Object.freeze({
  maxQueryLength: 100,
  maxPage: 500,
});

export const TMDB_CACHE_TAG = "tmdb";
