'use client';

export const NOTIFICATION_EASINGS = Object.freeze({
  EMPHASIZED: [0.16, 1, 0.24, 1],
  EXIT: [0.4, 0, 0.2, 1],
});

export const NOTIFICATION_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 450,
  damping: 26,
});

export const NOTIFICATION_MICRO_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 500,
  damping: 30,
});

export const NOTIFICATION_TAP_SCALE = 0.97;
export const NOTIFICATION_MICRO_TAP_SCALE = 0.95;

export const NOTIFICATION_FADE_TRANSITION = Object.freeze({
  duration: 0.22,
  ease: NOTIFICATION_EASINGS.EMPHASIZED,
});

export const NOTIFICATION_SLIDE_TRANSITION = Object.freeze({
  duration: 0.52,
  ease: NOTIFICATION_EASINGS.EMPHASIZED,
});

export const toastVariants = Object.freeze({
  hidden: {
    opacity: 0,
    x: 80,
    scale: 0.95,
    filter: 'blur(12px)',
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: NOTIFICATION_SLIDE_TRANSITION,
  },
  exit: {
    opacity: 0,
    x: 60,
    scale: 0.95,
    filter: 'blur(8px)',
    transition: {
      duration: 0.35,
      ease: NOTIFICATION_EASINGS.EXIT,
    },
  },
});
