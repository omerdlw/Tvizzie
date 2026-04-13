import { ACCOUNT_CLIENT } from '@/config/account.config';

import { SEARCH_LIMITS, SEARCH_STYLES, SEARCH_TYPES } from './constants';

function resolveNavActionTone(tone, isActive) {
  if (!tone || tone === 'toggle') {
    return isActive ? SEARCH_STYLES.action.active : SEARCH_STYLES.action.muted;
  }

  return SEARCH_STYLES.action[tone] || SEARCH_STYLES.action.muted;
}

export function navActionClass({ cn, button = '', isActive = false, tone, className } = {}) {
  return cn(button, resolveNavActionTone(tone, isActive), className);
}

export function normalizeResult(item, type = item?.media_type) {
  return {
    ...item,
    media_type: type,
  };
}

export function getDetailPath(item) {
  if (!item?.id || !item?.media_type) return null;

  switch (item.media_type) {
    case SEARCH_TYPES.MOVIE:
      return `/movie/${item.id}`;
    case SEARCH_TYPES.PERSON:
      return `/person/${item.id}`;
    case SEARCH_TYPES.USER:
      return `/account/${item.username || item.id}`;
    default:
      return null;
  }
}

export function getItemTitle(item) {
  if (item.media_type === SEARCH_TYPES.USER) {
    return item.displayName || item.username || 'Unknown User';
  }

  return item.title || item.name || 'Untitled';
}

export function getItemSubtitle(item) {
  switch (item.media_type) {
    case SEARCH_TYPES.USER:
      return 'USER';
    case SEARCH_TYPES.MOVIE:
      return 'MOVIE';
    case SEARCH_TYPES.PERSON:
    default:
      return 'PERSON';
  }
}

export function getItemYear(item) {
  const date = item.release_date || item.first_air_date || '';
  return date.substring(0, 4);
}

export function getItemDirector(item) {
  return item.director || null;
}

export function getItemStatus(item) {
  return item.status || null;
}

export function getImagePath(item) {
  if (item.media_type === SEARCH_TYPES.USER) return null;
  return item.poster_path || item.profile_path || item.backdrop_path || null;
}

function isExactUserMatch(item, normalizedQuery) {
  const displayName = String(item.displayName || '')
    .trim()
    .toLowerCase();
  const username = String(item.username || '')
    .trim()
    .toLowerCase();

  return displayName === normalizedQuery || username === normalizedQuery;
}

export function inferSearchType({ normalizedQuery, userResults, mediaResults }) {
  const exactUserMatch = userResults.find((item) => isExactUserMatch(item, normalizedQuery));

  if (exactUserMatch) {
    return SEARCH_TYPES.USER;
  }

  if (!mediaResults.length) {
    return SEARCH_TYPES.ALL;
  }

  const exactMediaMatch = mediaResults.find(
    (item) => (item.title || item.name || '').toLowerCase() === normalizedQuery
  );

  return exactMediaMatch?.media_type || mediaResults[0]?.media_type || SEARCH_TYPES.ALL;
}

export async function fetchUsers(query, limitCount = SEARCH_LIMITS.USER_RESULTS) {
  const users = await ACCOUNT_CLIENT.searchAccounts(query, {
    limitCount,
  });

  return users.map((item) => normalizeResult(item, SEARCH_TYPES.USER));
}

export async function fetchMediaPage(query, type, page = 1) {
  const { TmdbService } = await import('@/core/services/tmdb/tmdb.service');

  if (type !== SEARCH_TYPES.MOVIE && type !== SEARCH_TYPES.PERSON) {
    return {
      page: 1,
      results: [],
      totalPages: 0,
      totalResults: 0,
    };
  }

  const response = await TmdbService.searchContent(query, type, page);

  if (response.status !== 200 || !response.data?.results) {
    return {
      page: 1,
      results: [],
      totalPages: 0,
      totalResults: 0,
    };
  }

  const data = response.data;

  return {
    page: Number(data?.page) || page,
    results: data.results.map((item) => normalizeResult(item)),
    totalPages: Number(data?.total_pages) || 0,
    totalResults: Number(data?.total_results) || 0,
  };
}

export async function fetchMedia(query, type) {
  const payload = await fetchMediaPage(query, type, 1);
  return payload.results;
}

function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sortByPopularityDesc(first, second) {
  const popularityDiff = toFiniteNumber(second?.popularity) - toFiniteNumber(first?.popularity);

  if (popularityDiff !== 0) {
    return popularityDiff;
  }

  const voteCountDiff = toFiniteNumber(second?.vote_count) - toFiniteNumber(first?.vote_count);

  if (voteCountDiff !== 0) {
    return voteCountDiff;
  }

  return toFiniteNumber(second?.vote_average) - toFiniteNumber(first?.vote_average);
}

export async function fetchAllMedia(query, page = 1) {
  const [moviePayload, personPayload] = await Promise.all([
    fetchMediaPage(query, SEARCH_TYPES.MOVIE, page),
    fetchMediaPage(query, SEARCH_TYPES.PERSON, page),
  ]);

  return [...moviePayload.results, ...personPayload.results].sort(sortByPopularityDesc);
}

export function mergeAllResults(userResults, mediaResults, maxResults = SEARCH_LIMITS.MAX_RESULTS) {
  const merged = [...userResults, ...mediaResults];

  if (Number.isFinite(maxResults) && maxResults > 0) {
    return merged.slice(0, maxResults);
  }

  return merged;
}

export function limitMediaResults(results) {
  return results.slice(0, SEARCH_LIMITS.MEDIA_RESULTS);
}
