import { INFO_ACTION_TONE_CLASS, MOTION_EASINGS, MOTION_SPRINGS } from '@/shared';
import { cn } from '@/ui/class-names';

import { MODAL_POSITIONS } from './config';

// ── Modal motion contract ───────────────────────────────────────────────────
// Every modal animation, transition, and interaction token lives here. The
// facade re-exports this contract so feature code never imports implementation
// details or invents a second motion language.

const MODAL_EASINGS = Object.freeze({
  CINEMATIC: MOTION_EASINGS.CINEMATIC,
  EMPHASIZED: MOTION_EASINGS.EMPHASIZED,
  SOFT: MOTION_EASINGS.SOFT,
  EXIT: MOTION_EASINGS.EXIT,
});

const MODAL_TIERS = Object.freeze({
  MICRO: { duration: 0.24, distance: 4, scaleDelta: 0.008, ease: MODAL_EASINGS.EMPHASIZED },
  FAST: { duration: 0.44, distance: 9, scaleDelta: 0.012, ease: MODAL_EASINGS.EMPHASIZED },
  STANDARD: { duration: 0.66, distance: 18, scaleDelta: 0.018, ease: MODAL_EASINGS.SOFT },
  SURFACE: { duration: 0.96, distance: 28, scaleDelta: 0.024, ease: MODAL_EASINGS.CINEMATIC },
});

const MODAL_SPRINGS = Object.freeze({
  MICRO: MOTION_SPRINGS.PRESS,
  PANEL: MOTION_SPRINGS.PANEL,
  BADGE: MOTION_SPRINGS.BADGE,
});

function toCssDistance(value = 0) {
  return typeof value === 'number' ? `${value}px` : value;
}

function toGpuTransform({ x = 0, y = 0, scale = 1 } = {}) {
  return `translate3d(${toCssDistance(x)}, ${toCssDistance(y)}, 0) scale(${scale})`;
}

export const MODAL_MICRO_SPRING = MODAL_SPRINGS.MICRO;
export const MODAL_PANEL_SPRING = MODAL_SPRINGS.PANEL;

export const MODAL_MICRO_TAP_SCALE = 0.97;
export const MODAL_MICRO_TAP = Object.freeze({
  transform: toGpuTransform({ scale: MODAL_MICRO_TAP_SCALE }),
});

export const MODAL_CONTENT_STAGGER = 0.06;

export const MODAL_CONTENT_VARIANTS = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform({ y: MODAL_TIERS.MICRO.distance, scale: 0.992 }),
    filter: 'blur(4px)',
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(),
    filter: 'blur(0px)',
    transition: {
      duration: MODAL_TIERS.FAST.duration,
      ease: MODAL_EASINGS.EMPHASIZED,
      delay: 0.08,
    },
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform({ y: 3, scale: 0.994 }),
    filter: 'blur(3px)',
    transition: { duration: 0.38, ease: MODAL_EASINGS.EXIT },
  },
});

export const MODAL_HEADER_VARIANTS = Object.freeze({
  hidden: { opacity: 0, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    filter: 'blur(0px)',
    transition: {
      duration: MODAL_TIERS.FAST.duration,
      ease: MODAL_EASINGS.EMPHASIZED,
      delay: 0.03,
    },
  },
  exit: {
    opacity: 0,
    filter: 'blur(3px)',
    transition: { duration: 0.38, ease: MODAL_EASINGS.EXIT },
  },
});

export const MODAL_FOOTER_VARIANTS = Object.freeze({
  hidden: { opacity: 0, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    filter: 'blur(0px)',
    transition: {
      duration: MODAL_TIERS.FAST.duration,
      ease: MODAL_EASINGS.EMPHASIZED,
      delay: 0.12,
    },
  },
  exit: {
    opacity: 0,
    filter: 'blur(3px)',
    transition: { duration: 0.38, ease: MODAL_EASINGS.EXIT },
  },
});

export const MODAL_LIST_VARIANTS = Object.freeze({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: MODAL_TIERS.MICRO.duration, ease: MODAL_EASINGS.EMPHASIZED },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.38, ease: MODAL_EASINGS.EXIT },
  },
});

export const MODAL_LIST_ITEM_VARIANTS = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform({
      y: MODAL_TIERS.FAST.distance,
      scale: 1 - MODAL_TIERS.FAST.scaleDelta,
    }),
    filter: 'blur(6px)',
  },
  visible: (index = 0) => ({
    opacity: 1,
    transform: toGpuTransform(),
    filter: 'blur(0px)',
    transition: {
      duration: MODAL_TIERS.FAST.duration,
      ease: MODAL_EASINGS.EMPHASIZED,
      delay: 0.06 + Math.min(Math.max(Number(index) || 0, 0) * MODAL_CONTENT_STAGGER, 0.42),
    },
  }),
  exit: {
    opacity: 0,
    transform: toGpuTransform({ y: -MODAL_TIERS.MICRO.distance, scale: 0.994 }),
    filter: 'blur(3px)',
    transition: { duration: 0.38, ease: MODAL_EASINGS.EXIT },
  },
});

function buildVariants(tierName, { axis, fullSlide = false, direction = 1 } = {}) {
  const tier = MODAL_TIERS[tierName];
  const distance = fullSlide ? '100%' : tier.distance;
  const signedDistance = direction < 0 ? (fullSlide ? '-100%' : -distance) : distance;
  const transform = axis === 'x' ? { x: signedDistance } : { y: signedDistance };

  return Object.freeze({
    hidden: {
      opacity: 0,
      transform: toGpuTransform(transform),
      filter: 'blur(10px)',
    },
    visible: {
      opacity: 1,
      transform: toGpuTransform(),
      filter: 'blur(0px)',
      transition: { duration: tier.duration, ease: tier.ease },
    },
    exit: {
      opacity: 0,
      transform: toGpuTransform(transform),
      filter: 'blur(6px)',
      transition: { duration: tier.duration * 0.72, ease: MODAL_EASINGS.EXIT },
    },
  });
}

export const modalBackdropVariants = Object.freeze({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.66, ease: MODAL_EASINGS.SOFT },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.38, ease: MODAL_EASINGS.EXIT },
  },
});

const CENTER_VARIANTS = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform({ y: 10, scale: 0.96 }),
    filter: 'blur(10px)',
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(),
    filter: 'blur(0px)',
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform({ y: 6, scale: 0.98 }),
    filter: 'blur(6px)',
    transition: { duration: 0.38, ease: MODAL_EASINGS.EXIT },
  },
});

const BOTTOM_VARIANTS = buildVariants('SURFACE', { axis: 'y', fullSlide: true });
const RIGHT_VARIANTS = buildVariants('SURFACE', { axis: 'x', fullSlide: true });
const LEFT_VARIANTS = buildVariants('SURFACE', {
  axis: 'x',
  fullSlide: true,
  direction: -1,
});
const TOP_VARIANTS = buildVariants('SURFACE', {
  axis: 'y',
  fullSlide: true,
  direction: -1,
});

export function getModalPositionVariants(position) {
  switch (position) {
    case MODAL_POSITIONS.BOTTOM:
      return BOTTOM_VARIANTS;
    case MODAL_POSITIONS.RIGHT:
      return RIGHT_VARIANTS;
    case MODAL_POSITIONS.LEFT:
      return LEFT_VARIANTS;
    case MODAL_POSITIONS.TOP:
      return TOP_VARIANTS;
    case MODAL_POSITIONS.CENTER:
    default:
      return CENTER_VARIANTS;
  }
}

export function getModalTransition(position) {
  return position === MODAL_POSITIONS.CENTER ? MODAL_PANEL_SPRING : undefined;
}

export const MODAL_BACKDROP_VARIANTS = modalBackdropVariants;
export const MODAL_POSITION_VARIANTS = getModalPositionVariants;

export const CANCEL_BUTTON_CLASS =
  'center h-9 shrink-0 cursor-pointer rounded-xl ring-1 ring-inset ring-white/10 px-4 text-xs font-semibold whitespace-nowrap uppercase text-white/70 hover:ring-transparent hover:bg-white hover:text-black';

export const ACTION_BUTTON_CLASS = cn(
  'center h-9 shrink-0 cursor-pointer rounded-xl px-4 text-xs font-semibold whitespace-nowrap uppercase disabled:cursor-not-allowed disabled:ring-white/5 disabled:bg-white/10 disabled:text-white/50',
  INFO_ACTION_TONE_CLASS,
);

export const MODAL_STACK_OVERLAY_CLASS =
  'pointer-events-auto absolute inset-0 z-50 cursor-pointer bg-white/10 transition-all duration-300 ease-in-out';
