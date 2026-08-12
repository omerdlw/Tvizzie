import { cn } from '@/shared/utils';

export const NAV_ACTION_STYLES = {
  base: 'center w-full gap-2 rounded-2xl border px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-[background-color,border-color,color,box-shadow,transform] duration-300 ease-out active:scale-[0.985]',
  muted: 'border-black/5 bg-black/5 hover:bg-black/10 text-black/70',
  active: 'border-black/15 bg-primary/50 hover:bg-primary/70 text-black',
  row: 'mt-2 flex w-full gap-2',
  icon: 16,
};

export function getNavActionClass({ isActive = false, className, variant } = {}) {
  return cn(
    variant || (isActive ? NAV_ACTION_STYLES.active : NAV_ACTION_STYLES.muted),
    NAV_ACTION_STYLES.base,
    className,
  );
}
