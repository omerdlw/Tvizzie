import { cn } from '@/core/utils';

export const NAV_ACTION_STYLES = {
  base: 'center w-full   gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 text-[11px] sm:text-xs font-semibold uppercase tracking-wider border',
  muted: 'border-black/5 bg-black/5 hover:bg-black/10 text-black/70',
  active: 'border-black/15 bg-primary/50 hover:bg-primary/70 text-black',
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
