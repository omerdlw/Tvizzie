import 'server-only';

export const CACHE_CONTROL = Object.freeze({
  NO_STORE: 'no-store',
  PRIVATE_USER_STATE: 'private, no-cache, no-store, must-revalidate',
  PUBLIC_ACCOUNT_RESOLVE: 'public, s-maxage=300, stale-while-revalidate=1800',
  PUBLIC_COMMUNITY_SEARCH: 'public, s-maxage=60, stale-while-revalidate=300',
  PUBLIC_MEDIA_COLLECTIONS: 'public, s-maxage=60, stale-while-revalidate=300',
  PUBLIC_MEDIA_REVIEWS: 'public, s-maxage=30, stale-while-revalidate=180',
  PUBLIC_SOCIAL_PROOF: 'public, s-maxage=120, stale-while-revalidate=600',
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
