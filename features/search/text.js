export const SEARCH_TEXT_STOPWORDS = new Set(['a', 'an', 'and', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to']);

export function normalizeString(value) {
  return String(value || '').trim();
}

export function normalizeComparableText(value) {
  return normalizeString(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizeComparableText(value) {
  return normalizeComparableText(value)
    .split(' ')
    .filter((token) => token.length >= 2 && !SEARCH_TEXT_STOPWORDS.has(token));
}

export function countTokenOverlap(source = [], target = []) {
  if (!source.length || !target.length) {
    return 0;
  }

  const targetSet = new Set(target);
  return source.filter((token) => targetSet.has(token)).length;
}

export function normalizeToken(value) {
  return normalizeString(value)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_');
}

export function hasExactComparableMatch(values = [], normalizedQuery = '') {
  if (!normalizedQuery) {
    return false;
  }

  return values.some((value) => normalizeComparableText(value) === normalizedQuery);
}
