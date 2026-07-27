'use client';

import { MODAL_POSITIONS } from './config';

export const MODAL_EASINGS = Object.freeze({
  EMPHASIZED: [0.16, 1, 0.24, 1],
  EXIT: [0.4, 0, 0.2, 1],
});

export const MODAL_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 450,
  damping: 26,
});

export const MODAL_MICRO_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 500,
  damping: 30,
});

export const MODAL_TAP_SCALE = 0.97;
export const MODAL_MICRO_TAP_SCALE = 0.95;

export const MODAL_FADE_TRANSITION = Object.freeze({
  duration: 0.22,
  ease: MODAL_EASINGS.EMPHASIZED,
});

export const MODAL_PANEL_TRANSITION = Object.freeze({
  duration: 0.42,
  ease: MODAL_EASINGS.EMPHASIZED,
});

export const modalBackdropVariants = Object.freeze({
  hidden: {
    opacity: 0,
    filter: 'blur(0px)',
  },
  visible: {
    opacity: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.35,
      ease: MODAL_EASINGS.EMPHASIZED,
    },
  },
  exit: {
    opacity: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.25,
      ease: MODAL_EASINGS.EXIT,
    },
  },
});

export const MODAL_CENTER_VARIANTS = Object.freeze({
  hidden: {
    opacity: 0,
    scale: 0.92,
    y: 16,
    filter: 'blur(12px)',
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: MODAL_PANEL_TRANSITION,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    filter: 'blur(8px)',
    transition: {
      duration: 0.25,
      ease: MODAL_EASINGS.EXIT,
    },
  },
});

export const MODAL_BOTTOM_VARIANTS = Object.freeze({
  hidden: {
    opacity: 0,
    y: '100%',
    scale: 0.98,
    filter: 'blur(10px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.45,
      ease: MODAL_EASINGS.EMPHASIZED,
    },
  },
  exit: {
    opacity: 0,
    y: '100%',
    scale: 0.98,
    filter: 'blur(6px)',
    transition: {
      duration: 0.3,
      ease: MODAL_EASINGS.EXIT,
    },
  },
});

export const MODAL_RIGHT_VARIANTS = Object.freeze({
  hidden: {
    opacity: 0,
    x: '100%',
    scale: 0.98,
    filter: 'blur(10px)',
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.45,
      ease: MODAL_EASINGS.EMPHASIZED,
    },
  },
  exit: {
    opacity: 0,
    x: '100%',
    scale: 0.98,
    filter: 'blur(6px)',
    transition: {
      duration: 0.3,
      ease: MODAL_EASINGS.EXIT,
    },
  },
});

export const MODAL_LEFT_VARIANTS = Object.freeze({
  hidden: {
    opacity: 0,
    x: '-100%',
    scale: 0.98,
    filter: 'blur(10px)',
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.45,
      ease: MODAL_EASINGS.EMPHASIZED,
    },
  },
  exit: {
    opacity: 0,
    x: '-100%',
    scale: 0.98,
    filter: 'blur(6px)',
    transition: {
      duration: 0.3,
      ease: MODAL_EASINGS.EXIT,
    },
  },
});

export const MODAL_TOP_VARIANTS = Object.freeze({
  hidden: {
    opacity: 0,
    y: '-100%',
    scale: 0.98,
    filter: 'blur(10px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.45,
      ease: MODAL_EASINGS.EMPHASIZED,
    },
  },
  exit: {
    opacity: 0,
    y: '-100%',
    scale: 0.98,
    filter: 'blur(6px)',
    transition: {
      duration: 0.3,
      ease: MODAL_EASINGS.EXIT,
    },
  },
});

export function getModalPositionVariants(position) {
  switch (position) {
    case MODAL_POSITIONS.BOTTOM:
      return MODAL_BOTTOM_VARIANTS;
    case MODAL_POSITIONS.RIGHT:
      return MODAL_RIGHT_VARIANTS;
    case MODAL_POSITIONS.LEFT:
      return MODAL_LEFT_VARIANTS;
    case MODAL_POSITIONS.TOP:
      return MODAL_TOP_VARIANTS;
    case MODAL_POSITIONS.CENTER:
    default:
      return MODAL_CENTER_VARIANTS;
  }
}
