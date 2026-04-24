import 'server-only';

import { cache } from 'react';

import { TMDB_API_URL } from '@/core/constants';
import { isPersonMediaType, normalizeMediaType } from '@/core/utils/media';
import { sanitizeMovieDetail, sanitizeMovieResults, sanitizePersonDetail } from '@/core/clients/tmdb/sanitize';

const TMDB_API_KEY = process.env.TMDB_API_KEY || '';

function resolveTimeoutMs(value, fallback) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

const TMDB_FETCH_TIMEOUT_MS = resolveTimeoutMs(process.env.TMDB_FETCH_TIMEOUT_MS, 4500);

const TMDB_HEADERS = Object.freeze({
  accept: 'application/json',
});

const TMDB_REVALIDATE = Object.freeze({
  TRENDING: 600,
  DISCOVER: 1800,
  GENRES: 60 * 60 * 24 * 7,
  DETAIL_BASE: 3600,
  DETAIL_SECONDARY: 60 * 60 * 6,
  SEARCH: 300,
});
const SEARCH_PAGE_SIZE = 20;
const SEARCH_SCAN_CONCURRENCY = 6;
const SEARCH_MIN_MOVIE_VOTE_COUNT = 100;
const SEARCH_MIN_MOVIE_VOTE_AVERAGE = 4;
const SEARCH_MIN_MOVIE_RUNTIME = 40;
const SEARCH_RUNTIME_CHECK_LIMIT = 80;

function resolveTmdbHeaders() {
  if (!TMDB_API_KEY) {
    throw new Error('TMDB_API_KEY is missing. Configure TMDB_API_KEY on the server.');
  }

  return {
    ...TMDB_HEADERS,
    Authorization: `Bearer ${TMDB_API_KEY}`,
  };
}

function buildTmdbUrl(pathname, query = {}) {
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

async function tmdbRequest(pathname, { query, revalidate, tags } = {}) {
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

function dedupeSearchItems(items = []) {
  const seen = new Set();

  return (Array.isArray(items) ? items : []).filter((item) => {
    const itemId = item?.id;
    const itemType = item?.media_type;
    const key = `${itemType || 'unknown'}:${itemId || 'unknown'}`;

    if (!itemId || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function withMediaType(items = [], mediaType) {
  return (items || []).map((item) => ({
    ...item,
    media_type: item?.media_type || mediaType,
  }));
}

async function normalizeSearchResults(items = [], query = '', requestedType = 'movie') {
  const normalizedType = isPersonMediaType(requestedType) ? 'person' : 'movie';
  return normalizedType === 'person'
    ? rankResolvedPersonSearchItems(items, query)
    : await rankResolvedMovieSearchItems(items, query);
}

function normalizeSearchQuery(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function createSearchFallbackQueries(query) {
  const normalizedQuery = normalizeSearchQuery(query);

  if (!normalizedQuery) {
    return [];
  }

  const tokens = normalizedQuery.split(' ').filter(Boolean);

  if (!tokens.length) {
    return [];
  }

  const lastToken = tokens[tokens.length - 1];

  if (lastToken.length < 5) {
    return [];
  }

  const variants = [];

  for (let trimCount = 1; trimCount <= 2; trimCount += 1) {
    const nextToken = lastToken.slice(0, Math.max(0, lastToken.length - trimCount));

    if (nextToken.length < 4) {
      break;
    }

    variants.push([...tokens.slice(0, -1), nextToken].join(' '));
  }

  return [...new Set(variants)].filter((candidate) => candidate && candidate !== normalizedQuery);
}

function normalizeSearchComparableText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeSearchComparableText(value) {
  return normalizeSearchComparableText(value).split(' ').filter(Boolean);
}

function getMovieSearchTexts(movie = {}) {
  return [movie?.title, movie?.original_title, movie?.name, movie?.original_name].filter(Boolean);
}

function getPersonSearchTexts(person = {}) {
  return [person?.name, person?.original_name].filter(Boolean);
}

function getSearchTokenPrefixScore(queryTokens = [], candidateTokens = []) {
  if (!queryTokens.length || !candidateTokens.length) {
    return 0;
  }

  return queryTokens.reduce((score, queryToken) => {
    if (candidateTokens.some((candidateToken) => candidateToken === queryToken)) {
      return score + 120;
    }

    if (candidateTokens.some((candidateToken) => candidateToken.startsWith(queryToken))) {
      return score + 80;
    }

    if (candidateTokens.some((candidateToken) => queryToken.startsWith(candidateToken))) {
      return score + 40;
    }

    return score;
  }, 0);
}

function getBestSearchTextScore(texts = [], query = '') {
  const normalizedQuery = normalizeSearchComparableText(query);
  const queryTokens = tokenizeSearchComparableText(query);

  if (!normalizedQuery) {
    return 0;
  }

  let bestScore = 0;

  texts.forEach((text) => {
    const normalizedText = normalizeSearchComparableText(text);
    const candidateTokens = tokenizeSearchComparableText(text);
    let score = 0;

    if (!normalizedText) {
      return;
    }

    if (normalizedText === normalizedQuery) {
      score += 1200;
    } else if (normalizedText.startsWith(normalizedQuery)) {
      score += 900;
    } else if (normalizedText.includes(normalizedQuery)) {
      score += 600;
    }

    score += getSearchTokenPrefixScore(queryTokens, candidateTokens);

    if (candidateTokens[0] && normalizedQuery.startsWith(candidateTokens[0])) {
      score += 40;
    }

    if (score > bestScore) {
      bestScore = score;
    }
  });

  return bestScore;
}

function getMovieAuthorityValue(movie = {}) {
  const popularity = Number(movie?.popularity) || 0;
  const voteCount = Number(movie?.vote_count) || 0;
  const voteAverage = Number(movie?.vote_average) || 0;
  const releaseYear = Number.parseInt(String(movie?.release_date || movie?.first_air_date || '').slice(0, 4), 10) || 0;
  const visualBonus = movie?.poster_path ? 20 : movie?.backdrop_path ? 8 : 0;

  return popularity * 6 + Math.log10(voteCount + 1) * 160 + voteAverage * 18 + releaseYear / 8 + visualBonus;
}

function getPersonAuthorityValue(person = {}) {
  const popularity = Number(person?.popularity) || 0;
  const knownForCount = Array.isArray(person?.known_for) ? person.known_for.length : 0;
  const profileBonus = person?.profile_path ? 18 : 0;

  return popularity * 8 + knownForCount * 12 + profileBonus;
}

function getMovieVoteCountValue(movie = {}) {
  return Number(movie?.vote_count) || 0;
}

function getMovieVoteAverageValue(movie = {}) {
  return Number(movie?.vote_average) || 0;
}

function getMovieRuntimeValue(movie = {}) {
  const runtime = Number(movie?.runtime);
  return Number.isFinite(runtime) && runtime > 0 ? runtime : null;
}

function passesMovieSearchQualityGate(movie = {}) {
  const voteCount = getMovieVoteCountValue(movie);
  const voteAverage = getMovieVoteAverageValue(movie);
  const runtime = getMovieRuntimeValue(movie);

  if (voteCount < SEARCH_MIN_MOVIE_VOTE_COUNT) {
    return false;
  }

  if (voteAverage < SEARCH_MIN_MOVIE_VOTE_AVERAGE) {
    return false;
  }

  if (runtime !== null && runtime < SEARCH_MIN_MOVIE_RUNTIME) {
    return false;
  }

  return true;
}

function isMovieSearchCandidate(movie = {}, query = '') {
  if (!movie?.id || movie?.adult) {
    return false;
  }

  if (!passesMovieSearchQualityGate(movie)) {
    return false;
  }

  return getMovieSearchTexts(movie).length > 0 && getBestSearchTextScore(getMovieSearchTexts(movie), query) > 0;
}

function isPersonSearchCandidate(person = {}, query = '') {
  if (!person?.id) {
    return false;
  }

  return getPersonSearchTexts(person).length > 0 && getBestSearchTextScore(getPersonSearchTexts(person), query) > 0;
}

function sortSearchItemsByAuthority(items = [], type = 'movie') {
  const safeItems = Array.isArray(items) ? [...items] : [];

  return safeItems.sort((left, right) => {
    const leftAuthority = type === 'person' ? getPersonAuthorityValue(left) : getMovieAuthorityValue(left);
    const rightAuthority = type === 'person' ? getPersonAuthorityValue(right) : getMovieAuthorityValue(right);

    if (rightAuthority !== leftAuthority) {
      return rightAuthority - leftAuthority;
    }

    return Number(right?.id || 0) - Number(left?.id || 0);
  });
}

function buildAuthorityFallbackItems(items = [], type = 'movie') {
  const normalizedItems = dedupeSearchItems(withMediaType(items, type));

  if (type === 'person') {
    return sortSearchItemsByAuthority(normalizedItems, type);
  }

  return sortSearchItemsByAuthority(
    normalizedItems.filter((movie) => passesMovieSearchQualityGate(movie)),
    type
  );
}

function buildRankedMovieSearchEntries(items = [], query = '') {
  const candidates = dedupeSearchItems(withMediaType(items, 'movie')).filter((movie) =>
    isMovieSearchCandidate(movie, query)
  );

  return candidates
    .map((movie) => {
      const textScore = getBestSearchTextScore(getMovieSearchTexts(movie), query);
      const authorityScore = getMovieAuthorityValue(movie);

      return {
        authorityScore,
        item: movie,
        textScore,
        totalScore: textScore * 4 + authorityScore,
      };
    })
    .sort((left, right) => {
      if (right.totalScore !== left.totalScore) {
        return right.totalScore - left.totalScore;
      }

      if (right.textScore !== left.textScore) {
        return right.textScore - left.textScore;
      }

      return right.authorityScore - left.authorityScore;
    });
}

async function hydrateMovieSearchRuntimeCandidates(entries = []) {
  const runtimeCandidates = (Array.isArray(entries) ? entries : [])
    .slice(0, SEARCH_RUNTIME_CHECK_LIMIT)
    .filter(({ item }) => getMovieRuntimeValue(item) === null);

  if (!runtimeCandidates.length) {
    return entries;
  }

  const hydratedEntries = await Promise.all(
    runtimeCandidates.map(async ({ item }) => {
      const hydratedItem = await hydrateMovieRuntime(item);
      return [item.id, hydratedItem];
    })
  );
  const hydratedById = new Map(hydratedEntries);

  return entries.map((entry) => {
    const hydratedItem = hydratedById.get(entry.item?.id);

    if (!hydratedItem) {
      return entry;
    }

    return {
      ...entry,
      authorityScore: getMovieAuthorityValue(hydratedItem),
      item: hydratedItem,
      totalScore: entry.textScore * 4 + getMovieAuthorityValue(hydratedItem),
    };
  });
}

async function rankResolvedMovieSearchItems(items = [], query = '') {
  const rankedEntries = buildRankedMovieSearchEntries(items, query);
  const hydratedEntries = await hydrateMovieSearchRuntimeCandidates(rankedEntries);

  return hydratedEntries
    .filter(({ item }) => passesMovieSearchQualityGate(item))
    .sort((left, right) => {
      if (right.totalScore !== left.totalScore) {
        return right.totalScore - left.totalScore;
      }

      if (right.textScore !== left.textScore) {
        return right.textScore - left.textScore;
      }

      return right.authorityScore - left.authorityScore;
    })
    .map(({ item }) => item);
}

function rankResolvedPersonSearchItems(items = [], query = '') {
  const normalizedItems = dedupeSearchItems(withMediaType(items, 'person'));
  const candidates = normalizedItems.filter((person) => isPersonSearchCandidate(person, query));

  if (!candidates.length) {
    return sortSearchItemsByAuthority(normalizedItems, 'person');
  }

  return candidates
    .map((person) => {
      const textScore = getBestSearchTextScore(getPersonSearchTexts(person), query);
      const authorityScore = getPersonAuthorityValue(person);

      return {
        authorityScore,
        item: person,
        textScore,
        totalScore: textScore * 4 + authorityScore,
      };
    })
    .sort((left, right) => {
      if (right.totalScore !== left.totalScore) {
        return right.totalScore - left.totalScore;
      }

      if (right.textScore !== left.textScore) {
        return right.textScore - left.textScore;
      }

      return right.authorityScore - left.authorityScore;
    })
    .map(({ item }) => item);
}

function resolveSearchPageSize(items = []) {
  return Array.isArray(items) && items.length > 0 ? items.length : SEARCH_PAGE_SIZE;
}

function paginateSearchItems(items = [], page = 1, pageSize = SEARCH_PAGE_SIZE) {
  const safeItems = Array.isArray(items) ? items : [];
  const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : SEARCH_PAGE_SIZE;
  const totalResults = safeItems.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / safePageSize));
  const currentPage = Math.min(Math.max(Number(page) || 1, 1), totalPages);
  const startIndex = (currentPage - 1) * safePageSize;

  return {
    page: currentPage,
    results: safeItems.slice(startIndex, startIndex + safePageSize),
    total_pages: totalPages,
    total_results: totalResults,
  };
}

async function requestTmdbSearchPage(query, type = 'movie', page = 1) {
  const response = await tmdbRequest(`/search/${type}`, {
    query: {
      query,
      page,
      language: 'en-US',
    },
    revalidate: TMDB_REVALIDATE.SEARCH,
    tags: [`tmdb:search:${type}`],
  });

  return response;
}

async function collectAllTmdbSearchItems(query, type = 'movie', totalPages = 1) {
  const collectedItems = [];

  for (let startPage = 2; startPage <= totalPages; startPage += SEARCH_SCAN_CONCURRENCY) {
    const pageBatch = Array.from(
      { length: Math.min(SEARCH_SCAN_CONCURRENCY, totalPages - startPage + 1) },
      (_, index) => startPage + index
    );
    const batchResponses = await Promise.all(pageBatch.map((nextPage) => requestTmdbSearchPage(query, type, nextPage)));

    batchResponses.forEach((response) => {
      const nextItems = withMediaType(response.data?.results || [], type);

      if (nextItems.length > 0) {
        collectedItems.push(...nextItems);
      }
    });
  }

  return collectedItems;
}

async function resolveExpandedSearchIndex(query, type = 'movie', rankingQuery = query) {
  const response = await requestTmdbSearchPage(query, type, 1);

  if (!response.data?.results) {
    return {
      pageSize: SEARCH_PAGE_SIZE,
      resolvedItems: [],
      response,
    };
  }

  const totalPages = Math.max(1, Number(response.data?.total_pages) || 1);
  const pageSize = resolveSearchPageSize(response.data.results);
  const firstPageItems = withMediaType(response.data.results, type);
  const remainingItems = totalPages > 1 ? await collectAllTmdbSearchItems(query, type, totalPages) : [];
  const mergedItems = dedupeSearchItems([...firstPageItems, ...remainingItems]);
  const resolvedItems = await normalizeSearchResults(mergedItems, rankingQuery, type);
  const fallbackItems = buildAuthorityFallbackItems(mergedItems, type);

  return {
    pageSize,
    resolvedItems: resolvedItems.length > 0 ? resolvedItems : fallbackItems,
    response,
  };
}

async function requestExpandedSearchContent(query, type = 'movie', page = 1, rankingQuery = query) {
  const { pageSize, resolvedItems, response } = await resolveExpandedSearchIndex(query, type, rankingQuery);
  const paginatedData = paginateSearchItems(resolvedItems, page, pageSize);

  return {
    ...response,
    data: {
      ...response.data,
      ...paginatedData,
    },
  };
}

function getDetailAppendParam(parts = []) {
  const values = Array.isArray(parts) ? parts.filter(Boolean) : [];
  return values.length > 0 ? values.join(',') : undefined;
}

const resolveTmdbDetailId = cache(async (id, type) => {
  if (typeof id !== 'string' || !id.startsWith('tt') || normalizeMediaType(type) !== 'movie') {
    return id;
  }

  const response = await findByExternalId(id);
  const data = response.data;

  if (!data) {
    return id;
  }

  const results = data.movie_results;

  if (!Array.isArray(results) || results.length === 0) {
    return id;
  }

  return results[0]?.id || id;
});

const resolveMovieRuntime = cache(async (id) => {
  const targetId = await resolveTmdbDetailId(id, 'movie');
  const response = await tmdbRequest(`/movie/${targetId}`, {
    query: {
      language: 'en-US',
    },
    revalidate: TMDB_REVALIDATE.DETAIL_BASE,
    tags: ['tmdb:movie:runtime', `tmdb:movie:${targetId}:runtime`],
  });

  return response?.data?.runtime ?? null;
});

async function hydrateMovieRuntime(item) {
  if (!item || typeof item !== 'object' || !item?.id) {
    return item;
  }

  if (Number.isFinite(Number(item?.runtime)) && Number(item.runtime) > 0) {
    return item;
  }

  const runtime = await resolveMovieRuntime(item.id);

  if (!Number.isFinite(Number(runtime)) || Number(runtime) <= 0) {
    return item;
  }

  return {
    ...item,
    runtime: Number(runtime),
  };
}

async function sanitizeMovieResultsWithRuntime(items = [], context = 'browse') {
  const hydratedItems = await Promise.all((Array.isArray(items) ? items : []).map((item) => hydrateMovieRuntime(item)));
  return sanitizeMovieResults(hydratedItems, context);
}

async function getEntityDetail(id, type, { append = [], revalidate, tags = [] } = {}) {
  const targetId = await resolveTmdbDetailId(id, type);
  const appendToResponse = getDetailAppendParam(append);

  const response = await tmdbRequest(`/${type}/${targetId}`, {
    query: {
      language: 'en-US',
      append_to_response: appendToResponse,
      ...(append.includes('images') && {
        include_image_language: 'en,null',
      }),
    },
    revalidate,
    tags: [`tmdb:${type}`, `tmdb:${type}:${targetId}`, ...tags],
  });

  return {
    ...response,
    targetId,
  };
}

async function findByExternalId(externalId, source = 'imdb_id') {
  return tmdbRequest(`/find/${externalId}`, {
    query: {
      external_source: source,
      language: 'en-US',
    },
    revalidate: TMDB_REVALIDATE.DETAIL_BASE,
    tags: ['tmdb:find'],
  });
}

export const getTrending = cache(async (timeWindow = 'day', mediaType = 'movie') => {
  const normalizedMediaType = normalizeMediaType(mediaType) === 'movie' ? 'movie' : 'movie';
  const response = await tmdbRequest(`/trending/${normalizedMediaType}/${timeWindow}`, {
    query: { language: 'en-US' },
    revalidate: TMDB_REVALIDATE.TRENDING,
    tags: [`tmdb:trending:${normalizedMediaType}:${timeWindow}`],
  });

  if (!response.data?.results) {
    return response;
  }

  const sanitizedResults = await sanitizeMovieResultsWithRuntime(
    withMediaType(response.data.results, normalizedMediaType),
    'browse'
  );

  return {
    ...response,
    data: {
      ...response.data,
      results: sanitizedResults,
    },
  };
});

export const getGenres = cache(async () => {
  const response = await tmdbRequest('/genre/movie/list', {
    query: { language: 'en-US' },
    revalidate: TMDB_REVALIDATE.GENRES,
    tags: ['tmdb:genres:movie'],
  });

  return {
    ...response,
    data: response.data?.genres || [],
  };
});

export const discoverContent = cache(async ({ genreId, page = 1, sortBy = 'popularity.desc' }) => {
  const normalizedGenre = genreId && genreId !== 'all' ? String(genreId) : 'all';

  const response = await tmdbRequest('/discover/movie', {
    query: {
      language: 'en-US',
      page,
      sort_by: sortBy,
      'with_runtime.gte': 40,
      with_genres: normalizedGenre === 'all' ? undefined : normalizedGenre,
    },
    revalidate: TMDB_REVALIDATE.DISCOVER,
    tags: [`tmdb:discover:movie:${normalizedGenre}:${sortBy}`, `tmdb:discover:movie:page:${page}`],
  });

  if (!response.data?.results) {
    return response;
  }

  const sanitizedResults = await sanitizeMovieResultsWithRuntime(
    withMediaType(response.data.results, 'movie'),
    'browse'
  );

  return {
    ...response,
    data: {
      ...response.data,
      results: sanitizedResults,
    },
  };
});

export async function searchContent(query, searchType = 'movie', page = 1) {
  const type = isPersonMediaType(searchType) ? 'person' : 'movie';
  const response = await requestExpandedSearchContent(query, type, page, query);

  if (Array.isArray(response.data?.results) && response.data.results.length > 0) {
    return response;
  }

  if (page !== 1) {
    return response;
  }

  const fallbackQueries = createSearchFallbackQueries(query);

  for (const fallbackQuery of fallbackQueries) {
    const fallbackResponse = await requestExpandedSearchContent(fallbackQuery, type, page, query);

    if (Array.isArray(fallbackResponse.data?.results) && fallbackResponse.data.results.length > 0) {
      return {
        ...fallbackResponse,
        data: {
          ...fallbackResponse.data,
          page,
        },
      };
    }
  }

  return response;
}

export const getMovieBase = cache(async (id) =>
  getEntityDetail(id, 'movie', {
    append: ['credits', 'keywords', 'release_dates', 'videos', 'watch/providers'],
    revalidate: TMDB_REVALIDATE.DETAIL_BASE,
  }).then((response) => ({
    ...response,
    data: sanitizeMovieDetail(response?.data),
  }))
);

export const getMovieSecondary = cache(async (id) =>
  getEntityDetail(id, 'movie', {
    append: ['images', 'recommendations', 'similar'],
    revalidate: TMDB_REVALIDATE.DETAIL_SECONDARY,
    tags: ['tmdb:movie:secondary'],
  }).then(async (response) => {
    const data = response?.data;

    if (!data) {
      return {
        ...response,
        data,
      };
    }

    const [recommendations, similar] = await Promise.all([
      sanitizeMovieResultsWithRuntime(data?.recommendations?.results || [], 'browse'),
      sanitizeMovieResultsWithRuntime(data?.similar?.results || [], 'browse'),
    ]);

    return {
      ...response,
      data: sanitizeMovieDetail({
        ...data,
        recommendations: data?.recommendations
          ? {
              ...data.recommendations,
              results: recommendations,
            }
          : data?.recommendations,
        similar: data?.similar
          ? {
              ...data.similar,
              results: similar,
            }
          : data?.similar,
      }),
    };
  })
);

export const getPersonBase = cache(async (id) =>
  getEntityDetail(id, 'person', {
    append: ['external_ids'],
    revalidate: TMDB_REVALIDATE.DETAIL_BASE,
  }).then((response) => ({
    ...response,
    data: sanitizePersonDetail(response?.data),
  }))
);

export const getPersonSecondary = cache(async (id) =>
  getEntityDetail(id, 'person', {
    append: ['images', 'movie_credits', 'tagged_images'],
    revalidate: TMDB_REVALIDATE.DETAIL_SECONDARY,
    tags: ['tmdb:person:secondary'],
  }).then(async (response) => {
    const data = response?.data;

    if (!data) {
      return {
        ...response,
        data,
      };
    }

    const [castCredits, crewCredits] = await Promise.all([
      sanitizeMovieResultsWithRuntime(data?.movie_credits?.cast || [], 'credits'),
      sanitizeMovieResultsWithRuntime(data?.movie_credits?.crew || [], 'credits'),
    ]);

    return {
      ...response,
      data: sanitizePersonDetail({
        ...data,
        movie_credits: data?.movie_credits
          ? {
              ...data.movie_credits,
              cast: castCredits,
              crew: crewCredits,
            }
          : data?.movie_credits,
      }),
    };
  })
);
