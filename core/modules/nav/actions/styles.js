import { cn } from '@/core/utils';

export const NAV_ACTION_STYLES = {
  base: 'center w-full rounded-[12px] gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border',
  muted: 'border-black/10 bg-black/5 hover:bg-black/10 hover:border-black/15 text-black/70',
  active: 'border-black/15 bg-black/10 hover:bg-black/5 hover:border-black/10',
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
