export const SEARCH_TEXT_STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'by',
  'for',
  'in',
  'of',
  'on',
  'or',
  'the',
  'to',
]);

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

export const SEARCH_TYPES = Object.freeze({
  ALL: 'all',
  MOVIE: 'movie',
  PERSON: 'person',
  TV: 'tv',
  USER: 'user',
});

export const SEARCH_LIMITS = Object.freeze({
  MAX_RESULTS: 8,
  MEDIA_RESULTS: 8,
  RESULTS_PER_PAGE: 4,
  USER_RESULTS: 8,
  USER_FULL_RESULTS: 10,
});

export const SEARCH_TAB_ITEMS = Object.freeze([
  {
    key: SEARCH_TYPES.ALL,
    label: 'All',
  },
  {
    key: SEARCH_TYPES.MOVIE,
    label: 'Movies',
  },
  {
    key: SEARCH_TYPES.TV,
    label: 'TV',
  },
  {
    key: SEARCH_TYPES.PERSON,
    label: 'People',
  },
  {
    key: SEARCH_TYPES.USER,
    label: 'Users',
  },
]);

export const SEARCH_STYLES = Object.freeze({
  action: Object.freeze({
    muted: 'border border-white/5 bg-white/5 text-white/70 hover:bg-white/10',
    active: 'border border-white/10 bg-white/10 hover:bg-white/15 text-white',
  }),
  input: 'flex w-full items-center p-2 pl-4 text-sm transition-all duration-300 ease-in-out',
  tabButton:
    'relative w-full shrink-0 flex-auto whitespace-nowrap px-3 py-1.5 text-xs transition-all duration-300 ease-in-out',
  tabList: 'hide-scrollbar flex items-center gap-2 overflow-x-auto',
  resultItem:
    'group flex cursor-pointer items-center justify-between p-0.5 transition-all duration-300 ease-in-out hover:bg-white/5',
  thumbnail: 'relative h-20 w-16 shrink-0 overflow-hidden',
  metaBadge: 'flex w-fit items-center gap-1 border border-white/5',
});
