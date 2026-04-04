import { DURATION, EASING } from '@/core/constants';

export const MODAL_POSITIONS = Object.freeze({
  CENTER: 'center',
  BOTTOM: 'bottom',
  RIGHT: 'right',
  LEFT: 'left',
  TOP: 'top',
});

export const MODAL_CHROME = Object.freeze({
  PANEL: 'panel',
  BARE: 'bare',
});

export const MODAL_BREAKPOINTS = Object.freeze({
  MOBILE_MAX_WIDTH: 639,
});

export const MODAL_PRESETS = Object.freeze({
  PREVIEW_MODAL: {
    chrome: MODAL_CHROME.BARE,
  },
  VIDEO_PREVIEW_MODAL: {
    chrome: MODAL_CHROME.BARE,
  },
});

export const ANIMATION_CONFIGS = Object.freeze({
  SPRING: EASING.SPRING_CONFIG.MODAL,
  SMOOTH: {
    type: 'tween',
    ease: EASING.ACCENT,
    duration: DURATION.SLOW,
  },
});
