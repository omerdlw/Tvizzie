import { TMDB_API_URL } from '@/core/constants';

const TMDB_PUBLIC_READ_TOKEN = process.env.NEXT_PUBLIC_TMDB_READ_TOKEN || '';

export const TMDB_SEARCH_REQUEST_TIMEOUT_MS = Object.freeze({
  full: 12000,
  preview: 7000,
});

function createHttpErrorResponse(status, fallbackMessage = 'Request failed') {
  return {
    data: null,
    error: status ? `Request failed with status ${status}` : fallbackMessage,
    status: status || 503,
  };
}

export async function requestJson(url, { method = 'GET', cache = 'default', timeoutMs = 0, headers = {} } = {}) {
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
        ...headers,
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
    return createHttpErrorResponse(response.status);
  }

  return {
    data: await response.json().catch(() => null),
    error: null,
    status: response.status,
  };
}

export function createApiUrl(pathname, params = {}) {
  const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'http://localhost';
  const url = new URL(pathname, origin);

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

export async function requestTmdbMovieImages(id) {
  if (!TMDB_PUBLIC_READ_TOKEN) {
    return null;
  }

  const normalizedBaseUrl = TMDB_API_URL.replace(/\/$/, '');

  return requestJson(`${normalizedBaseUrl}/movie/${id}/images?include_image_language=en,null`, {
    headers: {
      Authorization: `Bearer ${TMDB_PUBLIC_READ_TOKEN}`,
    },
  });
}
