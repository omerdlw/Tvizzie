import { cn } from '@/lib/utils'

const TONE = Object.freeze({
  active: 'bg-white/15 text-white ring-1 ring-white/20',
  muted:
    'bg-white/5 text-white/70 ring-1 ring-white/10 hover:bg-white/10 hover:text-white',
  primary:
    'bg-white text-black ring-1 ring-white/20 hover:bg-white/90 hover:text-black',
  danger: 'border border-error/35 bg-error/15 text-error hover:bg-error/25',
})

export const NAV_ACTION_LAYOUT = Object.freeze({
  row: 'mt-2.5 flex w-full items-center gap-2',
})

export const NAV_ACTION_BUTTON = Object.freeze({
  base: 'flex w-full cursor-pointer items-center justify-center gap-2 rounded-[20px] px-4 py-2.5 text-[11px] font-semibold tracking-[0.18em] uppercase transition-colors duration-[var(--motion-duration-fast)]',
})

export const NAV_ACTION_ICON = Object.freeze({
  default: 16,
})

function resolveNavActionTone(tone, isActive) {
  if (tone === 'toggle') {
    return isActive ? TONE.active : TONE.muted
  }

  return TONE[tone] || TONE.muted
}

export function navActionClass({
  button = NAV_ACTION_BUTTON.base,
  isActive = false,
  tone = 'muted',
  className,
} = {}) {
  return cn(button, resolveNavActionTone(tone, isActive), className)
}
