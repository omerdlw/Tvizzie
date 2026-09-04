import {
  NAV_ACTION_MOTION_PROPS,
  NAV_ACTION_STYLES,
  getNavActionClass,
  navActionClass,
} from '@/modules/nav/constants';

export const SEARCH_TYPES = Object.freeze({
  ALL: 'all',
  MOVIE: 'movie',
  PERSON: 'person',
  TV: 'tv',
  USER: 'user',
});

export const SEARCH_TAB_ITEMS = Object.freeze([
  { key: SEARCH_TYPES.ALL, label: 'All' },
  { key: SEARCH_TYPES.MOVIE, label: 'Movies' },
  { key: SEARCH_TYPES.TV, label: 'TV' },
  { key: SEARCH_TYPES.PERSON, label: 'People' },
  { key: SEARCH_TYPES.USER, label: 'Users' },
]);

export const SEARCH_STYLES = Object.freeze({
  action: NAV_ACTION_STYLES.action,
  input:
    'flex rounded-[20px] w-full items-center p-2 pl-4 text-sm transition-all duration-300 ease-in-out',
  tabButton:
    'relative w-full rounded-[20px] shrink-0 flex-auto whitespace-nowrap px-3 py-1.5 text-xs transition-all duration-300 ease-in-out',
  tabList: 'hide-scrollbar flex items-center gap-2.5 overflow-x-auto',
  resultItem:
    'group flex cursor-pointer rounded-[20px] items-center justify-between p-0.5 transition-all duration-300 ease-in-out hover:bg-white/10',
  thumbnail: 'relative rounded-[20px] h-20 w-16 shrink-0 overflow-hidden',
  metaBadge: 'flex w-fit items-center rounded-lg gap-1 ring-1 ring-inset ring-white/5',
});

export { NAV_ACTION_MOTION_PROPS, NAV_ACTION_STYLES, getNavActionClass, navActionClass };
