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
    active: 'border border-black/10 bg-black/10',
    muted: 'border border-black/5 bg-black/5 text-black/70',
  }),
  input: ' flex w-full text-sm items-center rounded-lg p-2 pl-4 transition-colors duration-(--motion-duration-fast)',
  tabButton: 'relative rounded-lg shrink-0 px-3 py-1.5 text-xs whitespace-nowrap w-full flex-auto transition-colors',
  tabList: 'hide-scrollbar -mx-1 flex items-center gap-2 overflow-x-auto px-1',
  resultItem: `group rounded-lg flex cursor-pointer items-center justify-between transition-all p-0.5 duration-(--motion-duration-fast) hover:bg-black/5`,
  thumbnail: 'relative h-20 w-16 rounded-md shrink-0 overflow-hidden',
  metaBadge: `flex w-fit items-center gap-1 rounded-md border border-black/10 bg-black/5`,
});
