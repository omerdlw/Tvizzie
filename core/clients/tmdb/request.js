import 'server-only';

import { TMDB_API_URL } from '@/core/constants';

import { TMDB_FETCH_TIMEOUT_MS, TMDB_HEADERS } from './config';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '';

function resolveTmdbHeaders() {
  if (!TMDB_API_KEY) {
    throw new Error('TMDB_API_KEY is missing. Configure TMDB_API_KEY on the server.');
  }

  return {
    ...TMDB_HEADERS,
    Authorization: `Bearer ${TMDB_API_KEY}`,
  };
}

export function buildTmdbUrl(pathname, query = {}) {
  const normalizedPath = String(pathname || '').replace(/^\/+/, '');
  const url = new URL(normalizedPath, `${TMDB_API_URL.replace(/\/$/, '')}/`);

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    url.searchParams.set(key, String(value));
  });

  return url;
}

export async function tmdbRequest(pathname, { query, revalidate, tags } = {}) {
  let response;

  try {
    const timeoutSignal = AbortSignal.timeout(TMDB_FETCH_TIMEOUT_MS);

    response = await fetch(buildTmdbUrl(pathname, query), {
      headers: resolveTmdbHeaders(),
      next: {
        revalidate,
        tags: ['tmdb', ...(tags || [])],
      },
      signal: timeoutSignal,
    });
  } catch (error) {
    const reason = error?.cause?.code || error?.code || error?.message || 'unknown';

    return {
      data: null,
      error: `TMDB request failed: ${reason}`,
      status: 503,
    };
  }

  if (!response.ok) {
    return {
      data: null,
      error: `TMDB request failed with status ${response.status}`,
      status: response.status,
    };
  }

  return {
    data: await response.json(),
    error: null,
    status: response.status,
  };
}
