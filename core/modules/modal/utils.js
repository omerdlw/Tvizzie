import { DURATION, EASING } from '@/core/constants';

import { ANIMATION_CONFIGS, MODAL_POSITIONS } from './config';

const SPRING_TRANSITION = ANIMATION_CONFIGS.SPRING;
const SMOOTH_TRANSITION = ANIMATION_CONFIGS.SMOOTH;

function createCenterVariant() {
  return {
    hidden: { scale: 0.94, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: SPRING_TRANSITION,
    },
    exit: {
      scale: 0.94,
      opacity: 0,
      transition: SPRING_TRANSITION,
    },
  };
}

function createDirectionalVariant(axis, hiddenValue) {
  return {
    hidden: { [axis]: hiddenValue, opacity: 0 },
    visible: {
      [axis]: 0,
      opacity: 1,
      transition: SMOOTH_TRANSITION,
    },
    exit: {
      [axis]: hiddenValue,
      opacity: 0,
      transition: SMOOTH_TRANSITION,
    },
  };
}

const POSITION_VARIANTS = Object.freeze({
  [MODAL_POSITIONS.CENTER]: createCenterVariant(),
  [MODAL_POSITIONS.TOP]: createDirectionalVariant('y', '-100%'),
  [MODAL_POSITIONS.BOTTOM]: createDirectionalVariant('y', '100%'),
  [MODAL_POSITIONS.LEFT]: createDirectionalVariant('x', '-100%'),
  [MODAL_POSITIONS.RIGHT]: createDirectionalVariant('x', '100%'),
});

export function getModalVariants(position) {
  return POSITION_VARIANTS[position] || POSITION_VARIANTS[MODAL_POSITIONS.CENTER];
}

export const POSITION_CLASSES = Object.freeze({
  [MODAL_POSITIONS.CENTER]: 'items-center justify-center',
  [MODAL_POSITIONS.TOP]: 'items-center justify-start',
  [MODAL_POSITIONS.BOTTOM]: 'items-center justify-end',
  [MODAL_POSITIONS.LEFT]: 'items-start justify-start',
  [MODAL_POSITIONS.RIGHT]: 'items-end justify-start',
});

export const BACKDROP_VARIANTS = Object.freeze({
  hidden: {
    opacity: 0,
    transition: {
      duration: DURATION.SLOW,
      ease: EASING.ACCENT,
    },
  },
  visible: {
    opacity: 1,
    transition: {
      duration: DURATION.SLOW,
      ease: EASING.ACCENT,
    },
  },
});
