import { MOTION_EASINGS, MOTION_SPRINGS } from '@/shared';

// ── Context-menu motion contract ────────────────────────────────────────────
// The menu view consumes every enter, exit, item, and press token from this
// file so context-menu animation remains consistent with the shared foundation.

const CONTEXT_MENU_EASINGS = Object.freeze({
  EMPHASIZED: MOTION_EASINGS.EMPHASIZED,
  SOFT: MOTION_EASINGS.SOFT,
  EXIT: MOTION_EASINGS.EXIT,
});

const CONTEXT_MENU_TIERS = Object.freeze({
  MICRO: { duration: 0.24, distance: 4, scaleDelta: 0.008, ease: CONTEXT_MENU_EASINGS.EMPHASIZED },
});

function toGpuTransform({ x = 0, y = 0, scale = 1 } = {}) {
  return `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
}

export const CONTEXT_MENU_MICRO_SPRING = MOTION_SPRINGS.PRESS;
export const CONTEXT_MENU_ITEM_TAP = Object.freeze({
  transform: toGpuTransform({ scale: 0.97 }),
});

export const menuContentVariants = Object.freeze({
  hidden: { opacity: 0, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    filter: 'blur(0px)',
    transition: {
      duration: CONTEXT_MENU_TIERS.MICRO.duration,
      ease: CONTEXT_MENU_EASINGS.SOFT,
      delay: 0.04,
    },
  },
  exit: {
    opacity: 0,
    filter: 'blur(3px)',
    transition: { duration: 0.18, ease: CONTEXT_MENU_EASINGS.EXIT },
  },
});

export const menuItemVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform({ y: CONTEXT_MENU_TIERS.MICRO.distance, scale: 0.992 }),
    filter: 'blur(4px)',
  },
  visible: (index = 0) => ({
    opacity: 1,
    transform: toGpuTransform(),
    filter: 'blur(0px)',
    transition: {
      duration: CONTEXT_MENU_TIERS.MICRO.duration,
      ease: CONTEXT_MENU_EASINGS.EMPHASIZED,
      delay: 0.04 + Math.min(Math.max(Number(index) || 0, 0) * 0.042, 0.21),
    },
  }),
  exit: {
    opacity: 0,
    transform: toGpuTransform({ y: -3, scale: 0.994 }),
    filter: 'blur(3px)',
    transition: { duration: 0.18, ease: CONTEXT_MENU_EASINGS.EXIT },
  },
});

export const menuPopVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform({ scale: 0.96 }),
    transformOrigin: 'top left',
    filter: 'blur(5px)',
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(),
    transformOrigin: 'top left',
    filter: 'blur(0px)',
    transition: {
      duration: CONTEXT_MENU_TIERS.MICRO.duration,
      ease: CONTEXT_MENU_EASINGS.EMPHASIZED,
    },
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform({ scale: 0.98 }),
    transformOrigin: 'top left',
    filter: 'blur(4px)',
    transition: { duration: 0.18, ease: CONTEXT_MENU_EASINGS.EXIT },
  },
});

export const CONTEXT_MENU_POP_VARIANTS = menuPopVariants;
export const CONTEXT_MENU_CONTENT_VARIANTS = menuContentVariants;
export const CONTEXT_MENU_ITEM_VARIANTS = menuItemVariants;

export const CONTEXT_MENU_ITEM_TRANSITION_CLASS = 'transition-all duration-200 ease-in-out';
export const CONTEXT_MENU_ICON_TRANSITION_CLASS = 'transition-colors duration-200 ease-in-out';
