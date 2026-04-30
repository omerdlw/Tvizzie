import 'server-only';

import { createAdminClient } from '@/core/clients/supabase/admin';

const SEARCH_SLOW_QUERY_THRESHOLD_MS = 1500;
const SEARCH_LOW_MOVIE_VOTE_COUNT = 100;
const SEARCH_LOW_MOVIE_VOTE_AVERAGE = 5;
const SEARCH_LOW_PERSON_POPULARITY = 1;

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeInteger(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : fallback;
}

function normalizeSearchType(value) {
  return normalizeValue(value) === 'person' ? 'person' : 'movie';
}

function normalizeSearchScope(value) {
  return normalizeValue(value) === 'full' ? 'full' : 'preview';
}

function getItemTitle(item = {}) {
  return normalizeValue(item.title || item.name || item.original_title || item.original_name);
}

function getLowQualityReason(item = {}, type = 'movie') {
  if (type === 'person') {
    if (!item.profile_path) return 'missing_profile';
    if ((Number(item.popularity) || 0) < SEARCH_LOW_PERSON_POPULARITY) return 'low_popularity';
    return '';
  }

  if (item.adult) return 'adult';
  if (!item.poster_path && !item.backdrop_path) return 'missing_visual';
  if ((Number(item.vote_count) || 0) < SEARCH_LOW_MOVIE_VOTE_COUNT) return 'low_vote_count';
  if ((Number(item.vote_average) || 0) < SEARCH_LOW_MOVIE_VOTE_AVERAGE) return 'low_vote_average';
  if (Number.isFinite(Number(item.runtime)) && Number(item.runtime) > 0 && Number(item.runtime) < 40) {
    return 'short_runtime';
  }

  return '';
}

function getLowQualitySamples(results = [], type = 'movie') {
  return (Array.isArray(results) ? results : [])
    .map((item) => ({
      id: item?.id || null,
      reason: getLowQualityReason(item, type),
      title: getItemTitle(item),
    }))
    .filter((item) => item.reason)
    .slice(0, 5);
}

export function buildSearchQualityEvent({
  data = {},
  durationMs = 0,
  error = null,
  page = 1,
  query = '',
  scope = 'preview',
  status = 200,
  type = 'movie',
} = {}) {
  const normalizedQuery = normalizeValue(query).replace(/\s+/g, ' ');
  const normalizedType = normalizeSearchType(type);
  const results = Array.isArray(data?.results) ? data.results : [];
  const lowQualitySamples = getLowQualitySamples(results, normalizedType);
  const resultCount = results.length;
  const totalResults = normalizeInteger(data?.total_results, resultCount);
  const normalizedDurationMs = normalizeInteger(durationMs, 0);

  return {
    duration_ms: normalizedDurationMs,
    empty_results: !error && resultCount === 0,
    error_message: error ? normalizeValue(error?.message || error).slice(0, 500) : null,
    low_quality_count: lowQualitySamples.length,
    low_quality_samples: lowQualitySamples,
    metadata: {
      pageResults: resultCount,
    },
    normalized_query: normalizedQuery.toLowerCase(),
    page: normalizeInteger(page, 1) || 1,
    query_length: normalizedQuery.length,
    result_count: resultCount,
    search_scope: normalizeSearchScope(scope),
    search_type: normalizedType,
    slow_query: normalizedDurationMs >= SEARCH_SLOW_QUERY_THRESHOLD_MS,
    status: normalizeInteger(status, 200) || 200,
    total_results: totalResults,
  };
}

export async function logSearchQualityEvent(event) {
  if (!event?.normalized_query) {
    return;
  }

  try {
    const admin = createAdminClient();
    await admin.from('search_quality_events').insert(event);
  } catch {
    // Search quality logging must never affect the user-facing search path.
  }
}
