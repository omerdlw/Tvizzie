export const SEARCH_TYPES = Object.freeze({
  ALL: 'all',
  MOVIE: 'movie',
  PERSON: 'person',
  USER: 'user',
});

export const SEARCH_LIMITS = Object.freeze({
  MAX_RESULTS: 6,
  MEDIA_RESULTS: 6,
  USER_RESULTS: 6,
  USER_FULL_RESULTS: 10,
});

export const SEARCH_GRID = Object.freeze({
  MOBILE_COLUMNS: 6,
  MOBILE_ROWS: 12,
  DESKTOP_COLUMNS: 12,
  DESKTOP_ROWS: 8,
  DESKTOP_BREAKPOINT: 1024,
});

export const SEARCH_TAB_ITEMS = Object.freeze([
  { key: SEARCH_TYPES.ALL, label: 'All' },
  { key: SEARCH_TYPES.MOVIE, label: 'Movies' },
  { key: SEARCH_TYPES.PERSON, label: 'People' },
  { key: SEARCH_TYPES.USER, label: 'Users' },
]);

export const SEARCH_STYLES = Object.freeze({
  action: Object.freeze({
    muted: 'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10',
    active: 'border border-white/10 bg-white/10 hover:bg-white/5 text-white',
  }),
  input: 'rounded-xs flex w-full text-sm items-center p-2 pl-4 transition-colors duration-[200ms]',
  tabButton: 'rounded-xs relative shrink-0 px-3 py-1.5 text-xs whitespace-nowrap w-full flex-auto transition-colors',
  tabList: 'hide-scrollbar -mx-1 flex items-center gap-2 overflow-x-auto px-1',
  resultItem:
    'group flex rounded cursor-pointer items-center justify-between transition-all p-0.5 duration-[200ms] hover:bg-white/10',
  thumbnail: 'rounded-xs relative h-20 w-16  shrink-0 overflow-hidden',
  metaBadge: 'flex rounded-xs w-fit  items-center gap-1 border border-white/10',
});
