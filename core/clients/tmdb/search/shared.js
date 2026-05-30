import { isPersonMediaType } from '@/core/utils/media';

import { SEARCH_PAGE_SIZE, SEARCH_RUNTIME_CHECK_LIMITS, SEARCH_SCAN_PAGE_LIMITS } from '../config';

const SEARCH_TEXT_BASE_SCORES = Object.freeze({
  exact: 1200,
  includes: 650,
  prefix: 900,
});

const SEARCH_TOKEN_SIMILARITY = Object.freeze({
  fuzzyHigh: 0.9,
  fuzzyLow: 0.82,
  fuzzyMin: 0.74,
  minMatch: 0.55,
});

const SEARCH_ARTICLES = Object.freeze(new Set(['a', 'an', 'the']));

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

export function normalizeSearchQuery(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function getSearchQueryLength(query = '') {
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

export function normalizeSearchComparableText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizeSearchComparableText(value) {
  return normalizeSearchComparableText(value).split(' ').filter(Boolean);
}

function createSearchTokenBigrams(token = '') {
  const normalizedToken = String(token || '').trim();

  if (normalizedToken.length < 2) {
    return new Set();
  }

  const bigrams = new Set();

  for (let index = 0; index < normalizedToken.length - 1; index += 1) {
    bigrams.add(normalizedToken.slice(index, index + 2));
  }

  return bigrams;
}

function getSearchTokenDiceSimilarity(left = '', right = '') {
  const normalizedLeft = String(left || '').trim();
  const normalizedRight = String(right || '').trim();

  if (!normalizedLeft || !normalizedRight) {
    return 0;
  }

  if (normalizedLeft === normalizedRight) {
    return 1;
  }

  const leftBigrams = createSearchTokenBigrams(normalizedLeft);
  const rightBigrams = createSearchTokenBigrams(normalizedRight);

  if (!leftBigrams.size || !rightBigrams.size) {
    return 0;
  }

  let overlapCount = 0;

  leftBigrams.forEach((value) => {
    if (rightBigrams.has(value)) {
      overlapCount += 1;
    }
  });

  return (2 * overlapCount) / (leftBigrams.size + rightBigrams.size);
}

function getSearchTokenSimilarity(queryToken = '', candidateToken = '') {
  const normalizedQueryToken = String(queryToken || '').trim();
  const normalizedCandidateToken = String(candidateToken || '').trim();

  if (!normalizedQueryToken || !normalizedCandidateToken) {
    return 0;
  }

  if (normalizedQueryToken === normalizedCandidateToken) {
    return 1;
  }

  if (
    normalizedCandidateToken.startsWith(normalizedQueryToken) ||
    normalizedQueryToken.startsWith(normalizedCandidateToken)
  ) {
    return 0.9;
  }

  if (
    normalizedQueryToken.length >= 4 &&
    normalizedCandidateToken.length >= 4 &&
    (normalizedQueryToken.includes(normalizedCandidateToken) || normalizedCandidateToken.includes(normalizedQueryToken))
  ) {
    return 0.72;
  }

  const diceSimilarity = getSearchTokenDiceSimilarity(normalizedQueryToken, normalizedCandidateToken);

  if (diceSimilarity >= SEARCH_TOKEN_SIMILARITY.fuzzyHigh) {
    return 0.78;
  }

  if (diceSimilarity >= SEARCH_TOKEN_SIMILARITY.fuzzyLow) {
    return 0.58;
  }

  if (diceSimilarity >= SEARCH_TOKEN_SIMILARITY.fuzzyMin) {
    return 0.36;
  }

  return 0;
}

function resolveBestSearchTokenMatch(queryToken = '', candidateTokens = []) {
  let bestSimilarity = 0;
  let bestIndex = -1;

  candidateTokens.forEach((candidateToken, candidateIndex) => {
    const nextSimilarity = getSearchTokenSimilarity(queryToken, candidateToken);

    if (nextSimilarity > bestSimilarity) {
      bestSimilarity = nextSimilarity;
      bestIndex = candidateIndex;
    }
  });

  return {
    bestIndex,
    bestSimilarity,
  };
}

function getSearchTokenMatchMetrics(queryTokens = [], candidateTokens = []) {
  if (!queryTokens.length || !candidateTokens.length) {
    return {
      coverageRatio: 0,
      orderedRatio: 0,
      startAligned: false,
      weightedCoverageRatio: 0,
    };
  }

  let weightedMatches = 0;
  let matchedTokenCount = 0;
  let orderedMatchCount = 0;
  let lastMatchedIndex = -1;
  let startAligned = false;

  queryTokens.forEach((queryToken, queryTokenIndex) => {
    const { bestIndex, bestSimilarity } = resolveBestSearchTokenMatch(queryToken, candidateTokens);

    if (bestSimilarity < SEARCH_TOKEN_SIMILARITY.minMatch || bestIndex === -1) {
      return;
    }

    weightedMatches += bestSimilarity;
    matchedTokenCount += 1;

    if (queryTokenIndex === 0 && bestIndex === 0 && bestSimilarity >= 0.75) {
      startAligned = true;
    }

    if (bestIndex > lastMatchedIndex) {
      orderedMatchCount += 1;
      lastMatchedIndex = bestIndex;
    }
  });

  return {
    coverageRatio: matchedTokenCount / queryTokens.length,
    orderedRatio: orderedMatchCount / queryTokens.length,
    startAligned,
    weightedCoverageRatio: weightedMatches / queryTokens.length,
  };
}

export function getSearchTokenPrefixScore(queryTokens = [], candidateTokens = []) {
  if (!queryTokens.length || !candidateTokens.length) {
    return 0;
  }

  return queryTokens.reduce((score, queryToken) => {
    const { bestSimilarity } = resolveBestSearchTokenMatch(queryToken, candidateTokens);

    if (bestSimilarity >= 0.99) {
      return score + 120;
    }

    if (bestSimilarity >= 0.9) {
      return score + 90;
    }

    if (bestSimilarity >= 0.75) {
      return score + 60;
    }

    if (bestSimilarity >= SEARCH_TOKEN_SIMILARITY.minMatch) {
      return score + 40;
    }

    return score;
  }, 0);
}

function resolveSearchQueryProfile(queryOrProfile = '') {
  if (queryOrProfile && typeof queryOrProfile === 'object' && typeof queryOrProfile.normalizedQuery === 'string') {
    return queryOrProfile;
  }

  return createSearchQueryProfile(queryOrProfile);
}

function resolveSearchQueryYear(queryTokens = []) {
  const currentYear = new Date().getFullYear() + 1;
  const yearToken = queryTokens.find((token) => /^(18|19|20)\d{2}$/.test(token));

  if (!yearToken) {
    return 0;
  }

  const parsedYear = Number.parseInt(yearToken, 10);
  return parsedYear >= 1888 && parsedYear <= currentYear ? parsedYear : 0;
}

export function createSearchQueryProfile(query = '') {
  const normalizedQuery = normalizeSearchComparableText(query);
  const queryTokens = tokenizeSearchComparableText(query);
  const relevantQueryTokens = queryTokens.filter((token) => !SEARCH_ARTICLES.has(token));

  return {
    normalizedQuery,
    queryLength: getSearchQueryLength(query),
    queryTokens,
    queryYear: resolveSearchQueryYear(queryTokens),
    relevantQueryTokens: relevantQueryTokens.length ? relevantQueryTokens : queryTokens,
  };
}

export function getSearchTextMatch(text = '', queryOrProfile = '') {
  const queryProfile = resolveSearchQueryProfile(queryOrProfile);
  const { normalizedQuery, relevantQueryTokens } = queryProfile;

  if (!normalizedQuery) {
    return {
      coverage: 0,
      isExactMatch: false,
      isPrefixMatch: false,
      isStrongMatch: false,
      isVeryStrongMatch: false,
      normalizedText: '',
      orderedCoverage: 0,
      score: 0,
      weightedCoverage: 0,
    };
  }

  const normalizedText = normalizeSearchComparableText(text);
  const candidateTokens = tokenizeSearchComparableText(text);

  if (!normalizedText || !candidateTokens.length) {
    return {
      coverage: 0,
      isExactMatch: false,
      isPrefixMatch: false,
      isStrongMatch: false,
      isVeryStrongMatch: false,
      normalizedText,
      orderedCoverage: 0,
      score: 0,
      weightedCoverage: 0,
    };
  }

  const isExactMatch = normalizedText === normalizedQuery;
  const isPrefixMatch = !isExactMatch && normalizedText.startsWith(normalizedQuery);
  const isIncludesMatch = !isExactMatch && !isPrefixMatch && normalizedText.includes(normalizedQuery);
  const tokenPrefixScore = getSearchTokenPrefixScore(relevantQueryTokens, candidateTokens);
  const tokenMatchMetrics = getSearchTokenMatchMetrics(relevantQueryTokens, candidateTokens);
  const fullTextSimilarity = getSearchTokenDiceSimilarity(normalizedQuery, normalizedText);
  let score = 0;

  if (isExactMatch) {
    score += SEARCH_TEXT_BASE_SCORES.exact;
  } else if (isPrefixMatch) {
    score += SEARCH_TEXT_BASE_SCORES.prefix;
  } else if (isIncludesMatch) {
    score += SEARCH_TEXT_BASE_SCORES.includes;
  }

  score += tokenPrefixScore;
  score += Math.round(tokenMatchMetrics.weightedCoverageRatio * 480);
  score += Math.round(tokenMatchMetrics.coverageRatio * 260);
  score += Math.round(tokenMatchMetrics.orderedRatio * 160);

  if (tokenMatchMetrics.startAligned) {
    score += 80;
  }

  if (fullTextSimilarity >= 0.96) {
    score += 220;
  } else if (fullTextSimilarity >= 0.9) {
    score += 140;
  } else if (fullTextSimilarity >= 0.84) {
    score += 70;
  } else if (fullTextSimilarity >= 0.76) {
    score += 30;
  }

  if (!isExactMatch && tokenMatchMetrics.coverageRatio < 0.4 && fullTextSimilarity < 0.78) {
    score -= 120;
  }

  const finalScore = Math.max(0, Math.round(score));
  const isStrongMatch =
    finalScore >= 980 ||
    tokenMatchMetrics.weightedCoverageRatio >= 0.78 ||
    (tokenMatchMetrics.coverageRatio >= 0.75 && fullTextSimilarity >= 0.82);
  const isVeryStrongMatch =
    isExactMatch ||
    finalScore >= 1250 ||
    (tokenMatchMetrics.weightedCoverageRatio >= 0.9 && tokenMatchMetrics.orderedRatio >= 0.8);

  return {
    coverage: tokenMatchMetrics.coverageRatio,
    isExactMatch,
    isPrefixMatch,
    isStrongMatch,
    isVeryStrongMatch,
    normalizedText,
    orderedCoverage: tokenMatchMetrics.orderedRatio,
    score: finalScore,
    weightedCoverage: tokenMatchMetrics.weightedCoverageRatio,
  };
}

export function getBestSearchTextMatch(texts = [], queryOrProfile = '') {
  const queryProfile = resolveSearchQueryProfile(queryOrProfile);
  const safeTexts = Array.isArray(texts) ? texts : [];
  let bestMatch = null;

  safeTexts.forEach((text) => {
    const nextMatch = getSearchTextMatch(text, queryProfile);

    if (!bestMatch || nextMatch.score > bestMatch.score) {
      bestMatch = nextMatch;
    }
  });

  return (
    bestMatch || {
      coverage: 0,
      isExactMatch: false,
      isPrefixMatch: false,
      isStrongMatch: false,
      isVeryStrongMatch: false,
      normalizedText: '',
      orderedCoverage: 0,
      score: 0,
      weightedCoverage: 0,
    }
  );
}

export function getBestSearchTextScore(texts = [], queryOrProfile = '') {
  return getBestSearchTextMatch(texts, queryOrProfile).score;
}

export function sortSearchItemsByAuthority(items = [], resolveAuthority, resolveId = (item) => item?.id) {
  const safeItems = Array.isArray(items) ? [...items] : [];

  return safeItems.sort((left, right) => {
    const leftAuthority = resolveAuthority(left);
    const rightAuthority = resolveAuthority(right);

    if (rightAuthority !== leftAuthority) {
      return rightAuthority - leftAuthority;
    }

    return Number(resolveId(right) || 0) - Number(resolveId(left) || 0);
  });
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
