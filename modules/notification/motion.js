import { MOTION_EASINGS, MOTION_SPRINGS } from '@/shared';

// ── Notification motion contract ───────────────────────────────────────────
// Toast motion is kept as data so the presentation layer consumes one
// consistent language for enter, exit, drag, and press interactions.

const NOTIFICATION_EASINGS = Object.freeze({
  EMPHASIZED: MOTION_EASINGS.EMPHASIZED,
  SOFT: MOTION_EASINGS.SOFT,
  EXIT: MOTION_EASINGS.EXIT,
});

const NOTIFICATION_TIERS = Object.freeze({
  MICRO: { duration: 0.24, distance: 4, scaleDelta: 0.008, ease: NOTIFICATION_EASINGS.EMPHASIZED },
  FAST: { duration: 0.44, distance: 9, scaleDelta: 0.012, ease: NOTIFICATION_EASINGS.EMPHASIZED },
  STANDARD: { duration: 0.66, distance: 18, scaleDelta: 0.018, ease: NOTIFICATION_EASINGS.SOFT },
});

function toGpuTransform({ x = 0, y = 0, scale = 1 } = {}) {
  return `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
}

export const NOTIFICATION_MICRO_SPRING = MOTION_SPRINGS.PRESS;
export const NOTIFICATION_MICRO_TAP_SCALE = 0.97;

export const NOTIFICATION_DRAG_CONSTRAINTS = Object.freeze({ left: 0, right: 0 });
export const NOTIFICATION_DRAG_ELASTIC = Object.freeze({ left: 0.05, right: 0.7 });
export const NOTIFICATION_WHILE_DRAG = Object.freeze({ scale: 0.98 });
export const NOTIFICATION_CLOSE_TAP = Object.freeze({
  transform: toGpuTransform({ scale: NOTIFICATION_MICRO_TAP_SCALE }),
});
export const NOTIFICATION_ACTION_TAP = Object.freeze({
  transform: toGpuTransform({ scale: NOTIFICATION_MICRO_TAP_SCALE }),
});
export const NOTIFICATION_ACTION_TRANSITION = MOTION_SPRINGS.PRESS;
export const NOTIFICATION_SURFACE_TRANSITION_CLASS = 'transition-all duration-300 ease-in-out';

export const notificationContentVariants = Object.freeze({
  hidden: { opacity: 0, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    filter: 'blur(0px)',
    transition: {
      duration: NOTIFICATION_TIERS.FAST.duration,
      ease: NOTIFICATION_EASINGS.SOFT,
      delay: 0.06,
    },
  },
  exit: {
    opacity: 0,
    filter: 'blur(3px)',
    transition: { duration: 0.38, ease: NOTIFICATION_EASINGS.EXIT },
  },
});

export const toastVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform({
      x: NOTIFICATION_TIERS.STANDARD.distance,
      scale: 1 - NOTIFICATION_TIERS.STANDARD.scaleDelta,
    }),
    filter: 'blur(6px)',
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(),
    filter: 'blur(0px)',
    transition: {
      duration: NOTIFICATION_TIERS.FAST.duration,
      ease: NOTIFICATION_EASINGS.EMPHASIZED,
    },
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform({ x: 28, scale: 0.976 }),
    filter: 'blur(4px)',
    transition: { duration: 0.38, ease: NOTIFICATION_EASINGS.EXIT },
  },
});

export const TOAST_VARIANTS = toastVariants;
export const NOTIFICATION_CONTENT_VARIANTS = notificationContentVariants;
