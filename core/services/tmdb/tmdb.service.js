import { TMDB_API_URL } from '@/core/constants';

const TMDB_PUBLIC_READ_TOKEN = process.env.NEXT_PUBLIC_TMDB_READ_TOKEN || '';
const MOVIE_IMAGES_CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const MOVIE_IMAGES_STORAGE_KEY_PREFIX = 'tmdb:movie-images:';
const TMDB_SEARCH_REQUEST_TIMEOUT_MS = Object.freeze({
  full: 12000,
  preview: 7000,
});
const movieImagesMemoryCache = new Map();
const movieImagesInFlightRequests = new Map();

function createMovieImagesStorageKey(id) {
  return `${MOVIE_IMAGES_STORAGE_KEY_PREFIX}${id}`;
}

function readMovieImagesCache(id) {
  const now = Date.now();
  const memoryEntry = movieImagesMemoryCache.get(id);

  if (memoryEntry && memoryEntry.expiresAt > now) {
    return memoryEntry.value;
  }

  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    const serializedValue = window.localStorage.getItem(createMovieImagesStorageKey(id));

    if (!serializedValue) {
      return null;
    }

    const parsedEntry = JSON.parse(serializedValue);

    if (!parsedEntry || parsedEntry.expiresAt <= now) {
      window.localStorage.removeItem(createMovieImagesStorageKey(id));
      return null;
    }

    movieImagesMemoryCache.set(id, parsedEntry);
    return parsedEntry.value;
  } catch {
    return null;
  }
}

function writeMovieImagesCache(id, value) {
  const entry = {
    value,
    expiresAt: Date.now() + MOVIE_IMAGES_CACHE_TTL_MS,
  };

  movieImagesMemoryCache.set(id, entry);

  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(createMovieImagesStorageKey(id), JSON.stringify(entry));
  } catch {
    // Ignore cache persistence failures (private mode / quota limits).
  }
}

async function requestTmdbMovieImages(id) {
  if (!TMDB_PUBLIC_READ_TOKEN) {
    return null;
  }

  const normalizedBaseUrl = TMDB_API_URL.replace(/\/$/, '');
  const response = await fetch(`${normalizedBaseUrl}/movie/${id}/images?include_image_language=en,null`, {
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${TMDB_PUBLIC_READ_TOKEN}`,
    },
  });

  if (!response.ok) {
    return {
      data: null,
      error: `Request failed with status ${response.status}`,
      status: response.status,
    };
  }

  return {
    data: await response.json(),
    error: null,
    status: response.status,
  };
}

async function requestJson(url, { method = 'GET', cache = 'default', timeoutMs = 0 } = {}) {
  const controller = new AbortController();
  const timeoutId =
    Number.isFinite(Number(timeoutMs)) && timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;
  let response;

  try {
    response = await fetch(url, {
      method,
      cache,
      signal: timeoutId ? controller.signal : undefined,
      headers: {
        accept: 'application/json',
      },
    });
  } catch (error) {
    return {
      data: null,
      error: error?.name === 'AbortError' ? 'Request timed out' : error?.message || 'Request failed',
      status: error?.name === 'AbortError' ? 408 : 503,
    };
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }

  if (!response.ok) {
    return {
      data: null,
      error: `Request failed with status ${response.status}`,
      status: response.status,
    };
  }

  return {
    data: await response.json(),
    error: null,
    status: response.status,
  };
}

function createUrl(pathname, params = {}) {
  const url = new URL(pathname, window.location.origin);

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

export class TmdbService {
  static async searchContent(query, searchType = 'movie', page = 1, options = {}) {
    const scope = options.scope === 'full' ? 'full' : 'preview';

    return requestJson(
      createUrl('/api/tmdb/search', {
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
    const normalizedId = String(id || '').trim();

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

    if (movieImagesInFlightRequests.has(normalizedId)) {
      return movieImagesInFlightRequests.get(normalizedId);
    }

    const requestPromise = (async () => {
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
    })();

    movieImagesInFlightRequests.set(normalizedId, requestPromise);

    try {
      return await requestPromise;
    } finally {
      movieImagesInFlightRequests.delete(normalizedId);
    }
  }

  static async getGenres() {
    return requestJson('/api/tmdb/genres');
  }

  static async discoverContent({ genreId, page = 1, sortBy = 'popularity.desc' }) {
    return requestJson(
      createUrl('/api/tmdb/discover', {
        genreId,
        page,
        sortBy,
      })
    );
  }
}
