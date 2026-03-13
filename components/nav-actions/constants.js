import { cn } from '@/lib/utils'

export const NAV_ACTION_STYLE_DEFAULTS = {
  layout: 'flex cursor-pointer items-center justify-center gap-2 mt-2.5 w-full',
  padding: 'px-4 py-2.5',
  radius: 'rounded-[20px]',
  transition: 'transition-all duration-300',
  typography: 'text-[11px] font-semibold tracking-widest uppercase',
}

export const NAV_ACTION_TONES = {
  active: 'bg-white/15 text-white ring-1 ring-white/15',
  muted:
    'bg-white/5 text-white/50 ring-1 ring-white/10 hover:bg-white/10 hover:text-white/80',
}

export function navActionBaseClass({
  layout = NAV_ACTION_STYLE_DEFAULTS.layout,
  padding = NAV_ACTION_STYLE_DEFAULTS.padding,
  radius = NAV_ACTION_STYLE_DEFAULTS.radius,
  transition = NAV_ACTION_STYLE_DEFAULTS.transition,
  typography = NAV_ACTION_STYLE_DEFAULTS.typography,
  className,
} = {}) {
  return cn(layout, padding, radius, transition, typography, className)
}
