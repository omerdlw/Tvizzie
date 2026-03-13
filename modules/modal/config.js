import { DURATION, EASING } from '@/lib/constants'

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
  SPRING: EASING.SPRING_CONFIG.MODAL,
  SMOOTH: {
    type: 'tween',
    ease: EASING.ACCENT,
    duration: DURATION.SLOW,
  },
}
