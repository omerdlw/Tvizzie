import { normalizeSearchQuery } from './shared';

const FALLBACK_QUERY_MAX_COUNT = 12;

function addFallbackQueryVariant(variants, value, sourceQuery = '') {
  const normalizedVariant = normalizeSearchQuery(value);
  const normalizedSource = normalizeSearchQuery(sourceQuery);

  if (!normalizedVariant || normalizedVariant === normalizedSource) {
    return;
  }

  variants.add(normalizedVariant);
}

function createSearchRewriteQueries(query) {
  const normalizedQuery = normalizeSearchQuery(query);
  const lowerCaseQuery = normalizedQuery.toLowerCase();
  const variants = new Set();
  const joinedUponQuery = lowerCaseQuery.replace(/\bup\s+on\b/g, 'upon');
  const punctuationNormalizedQuery = lowerCaseQuery
    .replace(/[._,:;!?()[\]{}]+/g, ' ')
    .replace(/[-/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  addFallbackQueryVariant(variants, joinedUponQuery, normalizedQuery);
  addFallbackQueryVariant(variants, punctuationNormalizedQuery, normalizedQuery);

  [lowerCaseQuery, joinedUponQuery, punctuationNormalizedQuery].forEach((candidate) => {
    const expandedOnceUponTime = candidate.replace(/\bonce\s+upon\s+time\b/g, 'once upon a time');

    addFallbackQueryVariant(variants, expandedOnceUponTime, normalizedQuery);

    if (candidate.includes(' and ')) {
      addFallbackQueryVariant(variants, candidate.replace(/\band\b/g, '&'), normalizedQuery);
    }

    if (candidate.includes('&')) {
      addFallbackQueryVariant(variants, candidate.replace(/&/g, 'and'), normalizedQuery);
    }
  });

  const articleStrippedQuery = punctuationNormalizedQuery.replace(/^(the|a|an)\s+/i, '').trim();

  addFallbackQueryVariant(variants, articleStrippedQuery, normalizedQuery);

  const withoutYear = punctuationNormalizedQuery
    .replace(/\b(18|19|20)\d{2}\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  addFallbackQueryVariant(variants, withoutYear, normalizedQuery);

  return [...variants];
}

export function createSearchFallbackQueries(query) {
  const normalizedQuery = normalizeSearchQuery(query);

  if (!normalizedQuery) {
    return [];
  }

  const rewrittenQueries = createSearchRewriteQueries(normalizedQuery);
  const tokens = normalizedQuery.split(' ').filter(Boolean);

  if (!tokens.length) {
    return rewrittenQueries.slice(0, FALLBACK_QUERY_MAX_COUNT);
  }

  const lastToken = tokens[tokens.length - 1];
  const variants = new Set(rewrittenQueries);

  if (lastToken.length >= 4) {
    for (let trimCount = 1; trimCount <= 3; trimCount += 1) {
      const nextToken = lastToken.slice(0, Math.max(0, lastToken.length - trimCount));

      if (nextToken.length < 3) {
        break;
      }

      addFallbackQueryVariant(variants, [...tokens.slice(0, -1), nextToken].join(' '), normalizedQuery);
    }
  }

  if (tokens.length > 1 && tokens[tokens.length - 1].length >= 3) {
    addFallbackQueryVariant(variants, tokens.slice(0, -1).join(' '), normalizedQuery);
  }

  if (tokens.length > 2) {
    addFallbackQueryVariant(variants, tokens.slice(0, -2).join(' '), normalizedQuery);
  }

  return [...variants].slice(0, FALLBACK_QUERY_MAX_COUNT);
}
