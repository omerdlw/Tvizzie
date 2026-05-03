import { cn } from '@/core/utils';

export const NAV_ACTION_STYLES = {
  base: 'center rounded-xs w-full gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 text-[11px] sm:text-xs font-semibold uppercase tracking-wider border-[0.5px]',
  muted: 'border-white/10 bg-white/5 hover:bg-white/10 text-white/70',
  active: 'border-white/10 bg-white/10 hover:bg-white/5 text-white',
  row: 'mt-2.5 flex w-full gap-2',
  icon: 16,
};

export function getNavActionClass({ isActive = false, className, variant } = {}) {
  return cn(
    variant || (isActive ? NAV_ACTION_STYLES.active : NAV_ACTION_STYLES.muted),
    NAV_ACTION_STYLES.base,
    className
  );
}
