import { cn } from '@/lib/utils'

export const NAV_ACTION_STYLES = {
  base: 'center w-full rounded-[12px] gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider',
  muted: 'surface-muted',
  active: 'surface-active',
  row: 'mt-2.5 flex w-full gap-2',
  icon: 16,
}

export function getNavActionClass({
  isActive = false,
  className,
  variant,
} = {}) {
  return cn(
    variant || (isActive ? NAV_ACTION_STYLES.active : NAV_ACTION_STYLES.muted),
    NAV_ACTION_STYLES.base,
    className
  )
}
