import { cn } from '@/domains/shell/shared/utils';

// --- NAVIGATION ACTION STYLES ---

export const NAV_ACTION_STYLES = Object.freeze({
  base: 'center w-full gap-2 border px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-300 ease-in-out cursor-pointer',
  muted: 'border-white/5 bg-white/5 hover:bg-white/10 text-white/70',
  active: 'border-white/10 bg-white/10 hover:bg-white/15 text-white',
  row: 'mt-2 flex w-full gap-2',
  icon: 16,
});

export function getNavActionClass({ isActive = false, className, variant } = {}) {
  return cn(
    variant || (isActive ? NAV_ACTION_STYLES.active : NAV_ACTION_STYLES.muted),
    NAV_ACTION_STYLES.base,
    className,
  );
}

// --- SEARCH ACTION & NAV ACTION STYLES ---

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

export function navActionClass({ cn: classNamesFn, button = '', isActive = false, tone = '' }) {
  const resolve = classNamesFn || cn;
  if (!tone) {
    return resolve(button, isActive ? SEARCH_STYLES.action.active : SEARCH_STYLES.action.muted);
  }
  return resolve(button, SEARCH_STYLES.action[tone] || SEARCH_STYLES.action.muted);
}
