'use client'

import { DURATION, EASING } from '@/lib/constants'

export const TRANSITION_PRESETS = {
  fade: {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transitionEnd: { transform: 'none', willChange: 'auto' },
    },
    exit: { opacity: 0 },
    transition: { duration: DURATION.NORMAL, ease: EASING.EASE_IN_OUT },
  },
  slideUp: {
    initial: { opacity: 0, y: 40 },
    animate: {
      opacity: 1,
      y: 0,
      transitionEnd: { transform: 'none', willChange: 'auto' },
    },
    exit: { opacity: 0, y: -40 },
    transition: { duration: DURATION.NORMAL, ease: EASING.EASE_IN_OUT },
  },
  slideDown: {
    initial: { opacity: 0, y: -40 },
    animate: {
      opacity: 1,
      y: 0,
      transitionEnd: { transform: 'none', willChange: 'auto' },
    },
    exit: { opacity: 0, y: 40 },
    transition: { duration: DURATION.NORMAL, ease: EASING.EASE_IN_OUT },
  },
  slideLeft: {
    initial: { opacity: 0, x: 40 },
    animate: {
      opacity: 1,
      x: 0,
      transitionEnd: { transform: 'none', willChange: 'auto' },
    },
    exit: { opacity: 0, x: -40 },
    transition: { duration: DURATION.NORMAL, ease: EASING.EASE_IN_OUT },
  },
  slideRight: {
    initial: { opacity: 0, x: -40 },
    animate: {
      opacity: 1,
      x: 0,
      transitionEnd: { transform: 'none', willChange: 'auto' },
    },
    exit: { opacity: 0, x: 40 },
    transition: { duration: DURATION.NORMAL, ease: EASING.EASE_IN_OUT },
  },
  scaleUp: {
    initial: { opacity: 0, scale: 0.92 },
    animate: {
      opacity: 1,
      scale: 1,
      transitionEnd: { transform: 'none', willChange: 'auto' },
    },
    exit: { opacity: 0, scale: 1.08 },
    transition: { duration: DURATION.NORMAL, ease: EASING.EASE_IN_OUT },
  },
  scaleDown: {
    initial: { opacity: 0, scale: 1.08 },
    animate: {
      opacity: 1,
      scale: 1,
      transitionEnd: { transform: 'none', willChange: 'auto' },
    },
    exit: { opacity: 0, scale: 0.92 },
    transition: { duration: DURATION.NORMAL, ease: EASING.EASE_IN_OUT },
  },
  blurFade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
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

export function getPreset(presetName) {
  if (!presetName) return TRANSITION_PRESETS[DEFAULT_PRESET]

  if (typeof presetName === 'object') {
    return presetName
  }

  return TRANSITION_PRESETS[presetName] || TRANSITION_PRESETS[DEFAULT_PRESET]
}

export function getBackgroundAnimation(presetName) {
  const preset = getPreset(presetName)
  return {
    initial: preset.initial,
    animate: preset.animate,
    exit: preset.exit,
    transition: preset.transition,
  }
}
