import { isPersonMediaType } from '@/core/utils/media';

import { isDisplayableMovie } from './sanitize';
import {
  SEARCH_MIN_MOVIE_RUNTIME,
  SEARCH_MIN_MOVIE_VOTE_AVERAGE,
  SEARCH_MIN_MOVIE_VOTE_COUNT,
  SEARCH_PAGE_SIZE,
  SEARCH_RUNTIME_CHECK_LIMITS,
  SEARCH_SCAN_PAGE_LIMITS,
} from './config';

export function dedupeSearchItems(items = []) {
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

export function withMediaType(items = [], mediaType) {
  return (items || []).map((item) => ({
    ...item,
    media_type: item?.media_type || mediaType,
  }));
}

export function normalizeSearchScope(scope = 'preview') {
  return scope === 'full' ? 'full' : 'preview';
}

function getSearchQueryLength(query = '') {
  return normalizeSearchQuery(query).replace(/\s+/g, '').length;
}

export function resolveSearchScanPageLimit(query = '', type = 'movie', scope = 'preview') {
  const normalizedScope = normalizeSearchScope(scope);
  const queryLength = getSearchQueryLength(query);
  const limitBucket = queryLength <= 3 ? 'short' : queryLength <= 5 ? 'medium' : 'long';
  const limit = SEARCH_SCAN_PAGE_LIMITS[normalizedScope][limitBucket];

  if (isPersonMediaType(type)) {
    return Math.min(limit, normalizedScope === 'full' ? 6 : 3);
  }

  return limit;
}

export function resolveSearchRuntimeCheckLimit(scope = 'preview') {
  return SEARCH_RUNTIME_CHECK_LIMITS[normalizeSearchScope(scope)];
}

export async function normalizeSearchResults(items = [], query = '', requestedType = 'movie', options = {}) {
  const normalizedType = isPersonMediaType(requestedType) ? 'person' : 'movie';
  return normalizedType === 'person'
    ? rankResolvedPersonSearchItems(items, query, options)
    : await rankResolvedMovieSearchItems(items, query, options);
}

function normalizeSearchQuery(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function createSearchFallbackQueries(query) {
  const normalizedQuery = normalizeSearchQuery(query);

  if (!normalizedQuery) {
    return [];
  }

  const rewrittenQueries = createSearchRewriteQueries(normalizedQuery);
  const tokens = normalizedQuery.split(' ').filter(Boolean);

  if (!tokens.length) {
    return rewrittenQueries;
  }

  const lastToken = tokens[tokens.length - 1];

  if (lastToken.length < 5) {
    return rewrittenQueries;
  }

  const variants = [...rewrittenQueries];

  for (let trimCount = 1; trimCount <= 2; trimCount += 1) {
    const nextToken = lastToken.slice(0, Math.max(0, lastToken.length - trimCount));

    if (nextToken.length < 4) {
      break;
    }

    variants.push([...tokens.slice(0, -1), nextToken].join(' '));
  }

  return [...new Set(variants)].filter((candidate) => candidate && candidate !== normalizedQuery);
}

function createSearchRewriteQueries(query) {
  const normalizedQuery = normalizeSearchQuery(query).toLowerCase();
  const variants = [];
  const joinedUponQuery = normalizedQuery.replace(/\bup\s+on\b/g, 'upon');

  if (joinedUponQuery !== normalizedQuery) {
    variants.push(joinedUponQuery);
  }

  const candidates = [normalizedQuery, joinedUponQuery];

  candidates.forEach((candidate) => {
    const expandedOnceUponTime = candidate.replace(/\bonce\s+upon\s+time\b/g, 'once upon a time');

    if (expandedOnceUponTime !== candidate) {
      variants.push(expandedOnceUponTime);
    }
  });

  return [...new Set(variants)].filter(Boolean);
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

function isDisplayableMovieForDetail(movie = {}) {
  return isDisplayableMovie(movie, 'detail');
}

function getPersonPopularityValue(person = {}) {
  return Number(person?.popularity) || 0;
}

function getPersonKnownForCount(person = {}) {
  return Array.isArray(person?.known_for) ? person.known_for.length : 0;
}

function passesMovieSearchQualityGate(movie = {}, options = {}) {
  const voteCount = getMovieVoteCountValue(movie);
  const voteAverage = getMovieVoteAverageValue(movie);
  const runtime = getMovieRuntimeValue(movie);
  const textScore = Number(options.textScore) || 0;
  const queryLength = getSearchQueryLength(options.query || '');
  const hasVisual = Boolean(movie?.poster_path || movie?.backdrop_path);
  const isStrongExactMatch = textScore >= 1200;
  const isStrongPrefixMatch = textScore >= 900 && queryLength >= 4;
  const canRelaxQualityGate = isStrongExactMatch || (isStrongPrefixMatch && hasVisual);

  if (voteCount < SEARCH_MIN_MOVIE_VOTE_COUNT) {
    if (!canRelaxQualityGate || voteCount < 5) {
      return false;
    }
  }

  if (voteAverage < SEARCH_MIN_MOVIE_VOTE_AVERAGE) {
    if (!canRelaxQualityGate || voteAverage <= 0) {
      return false;
    }
  }

  if (runtime !== null && runtime < SEARCH_MIN_MOVIE_RUNTIME) {
    if (!canRelaxQualityGate) {
      return false;
    }
  }

  return true;
}

function passesPersonSearchQualityGate(person = {}, scope = 'preview') {
  const popularity = getPersonPopularityValue(person);
  const knownForCount = getPersonKnownForCount(person);
  const hasProfile = Boolean(person?.profile_path);
  const hasDepartment = Boolean(String(person?.known_for_department || '').trim());
  const normalizedScope = normalizeSearchScope(scope);

  if (normalizedScope === 'preview') {
    return hasProfile && (popularity >= 0.25 || knownForCount > 0 || hasDepartment);
  }

  if (hasProfile) {
    return popularity >= 0.5 || knownForCount > 0 || hasDepartment;
  }

  return popularity >= 5 && (knownForCount > 0 || hasDepartment);
}

function isPersonPreviewQualityMatch(person = {}, textScore = 0, query = '') {
  const popularity = getPersonPopularityValue(person);
  const knownForCount = getPersonKnownForCount(person);
  const hasProfile = Boolean(person?.profile_path);
  const queryLength = getSearchQueryLength(query);

  if (!hasProfile) {
    return false;
  }

  if (queryLength <= 3) {
    if (popularity >= 2) {
      return true;
    }

    if (textScore >= 1200 && popularity >= 0.5) {
      return true;
    }

    return knownForCount >= 3;
  }

  if (queryLength <= 5) {
    if (popularity >= 1) {
      return true;
    }

    if (textScore >= 1200) {
      return true;
    }

    return popularity >= 0.5 && textScore >= 900 && knownForCount > 0;
  }

  if (popularity >= 1) {
    return true;
  }

  if (textScore >= 1200) {
    return true;
  }

  return popularity >= 0.5 && textScore >= 900;
}

function isMovieSearchCandidate(movie = {}, query = '') {
  if (!movie?.id || movie?.adult) {
    return false;
  }

  const texts = getMovieSearchTexts(movie);
  const textScore = getBestSearchTextScore(texts, query);

  if (!passesMovieSearchQualityGate(movie, { query, textScore })) {
    return false;
  }

  return texts.length > 0 && textScore > 0;
}

function isPersonSearchCandidate(person = {}, query = '', options = {}) {
  if (!person?.id) {
    return false;
  }

  if (!passesPersonSearchQualityGate(person, options.scope)) {
    return false;
  }

  const textScore = getBestSearchTextScore(getPersonSearchTexts(person), query);

  if (textScore <= 0) {
    return false;
  }

  if (normalizeSearchScope(options.scope) === 'preview' && !isPersonPreviewQualityMatch(person, textScore, query)) {
    return false;
  }

  return getPersonSearchTexts(person).length > 0;
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

export function buildAuthorityFallbackItems(items = [], type = 'movie', options = {}) {
  const normalizedItems = dedupeSearchItems(withMediaType(items, type));

  if (type === 'person') {
    if (normalizeSearchScope(options.scope) === 'preview') {
      return [];
    }

    return sortSearchItemsByAuthority(
      normalizedItems.filter((person) => passesPersonSearchQualityGate(person, options.scope)),
      type
    );
  }

  return sortSearchItemsByAuthority(
    normalizedItems.filter((movie) => passesMovieSearchQualityGate(movie) && isDisplayableMovieForDetail(movie)),
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

async function hydrateMovieSearchRuntimeCandidates(
  entries = [],
  { hydrateMovieRuntime, runtimeCheckLimit = SEARCH_RUNTIME_CHECK_LIMITS.preview } = {}
) {
  const runtimeCandidates = (Array.isArray(entries) ? entries : [])
    .slice(0, runtimeCheckLimit)
    .filter(({ item }) => getMovieRuntimeValue(item) === null);
  const hydrateRuntime = typeof hydrateMovieRuntime === 'function' ? hydrateMovieRuntime : async (item) => item;

  if (!runtimeCandidates.length) {
    return entries;
  }

  const hydratedEntries = await Promise.all(
    runtimeCandidates.map(async ({ item }) => {
      const hydratedItem = await hydrateRuntime(item);
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

async function rankResolvedMovieSearchItems(items = [], query = '', options = {}) {
  const rankedEntries = buildRankedMovieSearchEntries(items, query);
  const hydratedEntries = await hydrateMovieSearchRuntimeCandidates(rankedEntries, options);

  return hydratedEntries
    .filter(
      ({ item, textScore }) =>
        passesMovieSearchQualityGate(item, { query, textScore }) && isDisplayableMovieForDetail(item)
    )
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

function rankResolvedPersonSearchItems(items = [], query = '', options = {}) {
  const normalizedItems = dedupeSearchItems(withMediaType(items, 'person'));
  const qualityItems = normalizedItems.filter((person) => passesPersonSearchQualityGate(person, options.scope));
  const candidates = qualityItems.filter((person) => isPersonSearchCandidate(person, query, options));

  if (!candidates.length) {
    if (normalizeSearchScope(options.scope) === 'preview') {
      return [];
    }

    return sortSearchItemsByAuthority(qualityItems, 'person');
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

export function resolveSearchPageSize(items = []) {
  return Array.isArray(items) && items.length > 0 ? items.length : SEARCH_PAGE_SIZE;
}

export function paginateSearchItems(items = [], page = 1, pageSize = SEARCH_PAGE_SIZE) {
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
