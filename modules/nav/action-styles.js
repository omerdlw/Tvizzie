import { cn } from '@/ui/class-names';

export const NAV_ACTION_STYLES = Object.freeze({
  base: 'center w-full gap-2 border px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-300 ease-in-out cursor-pointer',
  muted: 'border-white/5 bg-white/5 hover:bg-white/10 text-white/70',
  active: 'border-white/10 bg-white/10 hover:bg-white/15 text-white',
  row: 'mt-2 flex w-full gap-2',
  icon: 16,
});

export function getNavActionClass({ className, isActive = false, variant } = {}) {
  return cn(
    variant || (isActive ? NAV_ACTION_STYLES.active : NAV_ACTION_STYLES.muted),
    NAV_ACTION_STYLES.base,
    className,
  );
}
