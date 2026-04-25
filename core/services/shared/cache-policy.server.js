import 'server-only';

export const CACHE_CONTROL = Object.freeze({
  NO_STORE: 'no-store',
  PUBLIC_TMDB_DISCOVER: 'public, s-maxage=1800, stale-while-revalidate=86400',
  PUBLIC_TMDB_ERROR_FALLBACK: 'public, s-maxage=300, stale-while-revalidate=3600',
  PUBLIC_TMDB_GENRES: 'public, s-maxage=604800, stale-while-revalidate=604800',
  PUBLIC_TMDB_SEARCH: 'public, s-maxage=300, stale-while-revalidate=86400',
  PUBLIC_TMDB_TRENDING: 'public, s-maxage=21600, stale-while-revalidate=86400',
});

export function cacheControlHeaders(policy) {
  return {
    'Cache-Control': policy,
  };
}
