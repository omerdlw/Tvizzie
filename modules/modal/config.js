import { DURATION } from '@/lib/constants'

export const MODAL_POSITIONS = {
  CENTER: 'center',
  BOTTOM: 'bottom',
  RIGHT: 'right',
  LEFT: 'left',
  TOP: 'top',
}

export const MODAL_CHROME = {
  PANEL: 'panel',
  BARE: 'bare',
}

export const MODAL_BREAKPOINTS = {
  MOBILE_MAX_WIDTH: 639,
}

export const MODAL_PRESETS = {
  PREVIEW_MODAL: {
    chrome: MODAL_CHROME.BARE,
  },
  VIDEO_PREVIEW_MODAL: {
    chrome: MODAL_CHROME.BARE,
  },
}

export const ANIMATION_CONFIGS = {
  SPRING: {
    stiffness: 260,
    type: 'spring',
    damping: 20,
  },
  SMOOTH: {
    type: 'tween',
    ease: [0.32, 0.72, 0, 1],
    duration: DURATION.SLOW,
  },
}
