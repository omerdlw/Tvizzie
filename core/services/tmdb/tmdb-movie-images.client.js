const MOVIE_IMAGES_CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const MOVIE_IMAGES_STORAGE_KEY_PREFIX = 'tmdb:movie-images:';

const movieImagesMemoryCache = new Map();
const movieImagesInFlightRequests = new Map();

function createMovieImagesStorageKey(id) {
  return `${MOVIE_IMAGES_STORAGE_KEY_PREFIX}${id}`;
}

export function readMovieImagesCache(id) {
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

export function writeMovieImagesCache(id, value) {
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

export async function withMovieImageInFlightRequest(id, requestFactory) {
  if (movieImagesInFlightRequests.has(id)) {
    return movieImagesInFlightRequests.get(id);
  }

  const requestPromise = Promise.resolve().then(() => requestFactory());
  movieImagesInFlightRequests.set(id, requestPromise);

  try {
    return await requestPromise;
  } finally {
    movieImagesInFlightRequests.delete(id);
  }
}
