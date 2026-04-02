'use client'

import { DURATION, EASING } from '@/lib/constants'

export const TRANSITION_PRESETS = {
  fade: {
    initial: {},
    animate: {
      transitionEnd: { transform: 'none', willChange: 'auto' },
    },
    exit: {},
    transition: { duration: DURATION.NORMAL, ease: EASING.EASE_IN_OUT },
  },

  slideUp: {
    initial: { y: 20, opacity: 0 },
    animate: {
      y: 0,
      opacity: 1,
      transitionEnd: { 
        transform: 'none',
        opacity: 'unset',
        willChange: 'auto' 
      },
    },
    exit: { y: 20, opacity: 0 },
    transition: { duration: DURATION.NORMAL, ease: EASING.EASE_IN_OUT },
  },

  slideDown: {
    initial: { y: -40 },
    animate: {
      y: 0,
      transitionEnd: { transform: 'none', willChange: 'auto' },
    },
    exit: { y: 40 },
    transition: { duration: DURATION.NORMAL, ease: EASING.EASE_IN_OUT },
  },

  slideLeft: {
    initial: { x: 40 },
    animate: {
      x: 0,
      transitionEnd: { transform: 'none', willChange: 'auto' },
    },
    exit: { x: -40 },
    transition: { duration: DURATION.NORMAL, ease: EASING.EASE_IN_OUT },
  },

  slideRight: {
    initial: { x: -40 },
    animate: {
      x: 0,
      transitionEnd: { transform: 'none', willChange: 'auto' },
    },
    exit: { x: 40 },
    transition: { duration: DURATION.NORMAL, ease: EASING.EASE_IN_OUT },
  },

  scaleUp: {
    initial: { scale: 0.92 },
    animate: {
      scale: 1,
      transitionEnd: { transform: 'none', willChange: 'auto' },
    },
    exit: { scale: 1.08 },
    transition: { duration: DURATION.NORMAL, ease: EASING.EASE_IN_OUT },
  },

  scaleDown: {
    initial: { scale: 1.08 },
    animate: {
      scale: 1,
      transitionEnd: { transform: 'none', willChange: 'auto' },
    },
    exit: { scale: 0.92 },
    transition: { duration: DURATION.NORMAL, ease: EASING.EASE_IN_OUT },
  },

  blurFade: {
    initial: {},
    animate: {},
    exit: {},
    transition: { duration: DURATION.NORMAL, ease: EASING.EASE_IN_OUT },
  },

  none: {
    initial: {},
    animate: {},
    exit: {},
    transition: { duration: DURATION.INSTANT },
  },
}

export const DEFAULT_PRESET = 'slideUp'

export function getPreset(preset) {
  if (!preset) return TRANSITION_PRESETS[DEFAULT_PRESET]

  if (typeof preset === 'object') {
    return {
      ...TRANSITION_PRESETS[DEFAULT_PRESET],
      ...preset,
    }
  }

  return TRANSITION_PRESETS[preset] || TRANSITION_PRESETS[DEFAULT_PRESET]
}

export function getBackgroundAnimation(preset) {
  const resolved = getPreset(preset)

  return {
    initial: resolved.initial,
    animate: resolved.animate,
    exit: resolved.exit,
    transition: resolved.transition,
  }
}
