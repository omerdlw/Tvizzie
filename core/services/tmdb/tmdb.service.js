import { createApiUrl, requestJson, requestTmdbMovieImages, TMDB_SEARCH_REQUEST_TIMEOUT_MS } from './tmdb-http.client';
import { readMovieImagesCache, withMovieImageInFlightRequest, writeMovieImagesCache } from './tmdb-movie-images.client';

function normalizeSearchScope(scope) {
  return scope === 'full' ? 'full' : 'preview';
}

function toRequiredId(value) {
  const normalizedId = String(value || '').trim();

  if (!normalizedId) {
    return null;
  }

  return normalizedId;
}

export class TmdbService {
  static async searchContent(query, searchType = 'movie', page = 1, options = {}) {
    const scope = normalizeSearchScope(options.scope);

    return requestJson(
      createApiUrl('/api/tmdb', {
        action: 'search',
        page,
        q: query,
        scope,
        type: searchType,
      }),
      {
        timeoutMs: options.timeoutMs ?? TMDB_SEARCH_REQUEST_TIMEOUT_MS[scope],
      }
    );
  }

  static async getPersonAwards(id) {
    return requestJson(`/api/person/${id}/awards`);
  }

  static async getMovieImages(id) {
    const normalizedId = toRequiredId(id);

    if (!normalizedId) {
      return {
        data: null,
        error: 'Movie id is required',
        status: 400,
      };
    }

    const cachedValue = readMovieImagesCache(normalizedId);

    if (cachedValue) {
      return {
        data: cachedValue,
        error: null,
        status: 200,
      };
    }

    return withMovieImageInFlightRequest(normalizedId, async () => {
      const directResponse = await requestTmdbMovieImages(normalizedId);

      if (directResponse?.data) {
        writeMovieImagesCache(normalizedId, directResponse.data);
        return directResponse;
      }

      return {
        data: null,
        error:
          directResponse?.error ||
          'TMDB movie images request failed. Set NEXT_PUBLIC_TMDB_READ_TOKEN for client access.',
        status: directResponse?.status || 503,
      };
    });
  }

  static async getGenres() {
    return requestJson('/api/tmdb?action=genres');
  }

  static async discoverContent({ genreId, page = 1, sortBy = 'popularity.desc' }) {
    return requestJson(
      createApiUrl('/api/tmdb', {
        action: 'discover',
        genreId,
        page,
        sortBy,
      })
    );
  }
}
