import 'server-only';

import { cache } from 'react';

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function resolveTimeoutMs(value, fallback) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function normalizeImdbId(value) {
  const normalizedValue = String(value || '').trim();
  return /^tt\d+$/.test(normalizedValue) ? normalizedValue : '';
}

function normalizeRatingValue(value) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function normalizeVoteCount(value) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue >= 0 ? Math.round(parsedValue) : null;
}

function buildImdbUrl(baseUrl, pathname) {
  const normalizedPath = String(pathname || '').replace(/^\/+/, '');
  return new URL(normalizedPath, `${baseUrl}/`);
}

const IMDB_API_BASE_URL = normalizeBaseUrl(process.env.IMDB_API_BASE_URL);
const IMDB_FETCH_TIMEOUT_MS = resolveTimeoutMs(process.env.IMDB_FETCH_TIMEOUT_MS, 4500);

const IMDB_REVALIDATE = Object.freeze({
  TITLE: 60 * 60 * 24,
});

async function imdbRequest(pathname, { revalidate, tags = [] } = {}) {
  if (!IMDB_API_BASE_URL) {
    return {
      data: null,
      error: 'IMDB_API_BASE_URL is missing.',
      status: 503,
    };
  }

  let response;

  try {
    response = await fetch(buildImdbUrl(IMDB_API_BASE_URL, pathname), {
      headers: {
        accept: 'application/json',
      },
      next: {
        revalidate,
        tags: ['imdb', ...tags],
      },
      signal: AbortSignal.timeout(IMDB_FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    const reason = error?.cause?.code || error?.code || error?.message || 'unknown';

    return {
      data: null,
      error: `IMDb request failed: ${reason}`,
      status: 503,
    };
  }

  if (!response.ok) {
    return {
      data: null,
      error: `IMDb request failed with status ${response.status}`,
      status: response.status,
    };
  }

  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('application/json')) {
    return {
      data: null,
      error: 'IMDb response was not JSON.',
      status: 502,
    };
  }

  return {
    data: await response.json(),
    error: null,
    status: response.status,
  };
}

export const getImdbTitleRating = cache(async (imdbId) => {
  const normalizedId = normalizeImdbId(imdbId);

  if (!normalizedId) {
    return null;
  }

  const response = await imdbRequest(`/title/${normalizedId}`, {
    revalidate: IMDB_REVALIDATE.TITLE,
    tags: [`imdb:title:${normalizedId}`],
  });

  const ratingValue = normalizeRatingValue(
    response?.data?.rating?.star ?? response?.data?.rating?.aggregateRating ?? response?.data?.aggregateRating
  );

  if (ratingValue === null) {
    return null;
  }

  return {
    count: normalizeVoteCount(response?.data?.rating?.count ?? response?.data?.rating?.voteCount),
    href: response?.data?.imdb || `https://www.imdb.com/title/${normalizedId}`,
    id: normalizedId,
    label: `IMDb ${ratingValue.toFixed(1)}/10`,
    value: ratingValue,
  };
});
