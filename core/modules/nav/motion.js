export const NAV_EASINGS = Object.freeze({
  STANDARD: [0.22, 1, 0.36, 1],
  EMPHASIZED: [0.16, 1, 0.3, 1],
  SOFT: [0.32, 0, 0.18, 1],
  EXIT: [0.4, 0, 0.2, 1],
  LINEAR_FADE: [0.33, 0.33, 0.67, 0.67],

  // Compatibility aliases
  CINEMATIC: [0.16, 1, 0.3, 1],
  SILK: [0.22, 1, 0.36, 1],
  LUXURY: [0.16, 1, 0.3, 1],
  SNAPPY_CINEMATIC: [0.22,  1, 0.36, 1],
  EMPHASIZED_ENTRANCE: [0.16, 1, 0.3, 1],
  SOFT_OUT: [0.32, 0, 0.18, 1],
  DEEP_EXIT: [0.4, 0, 0.2, 1],
});

export const NAV_CINEMATIC_EASE = NAV_EASINGS.EMPHASIZED;

export const NAV_DURATIONS = Object.freeze({
  MICRO: 0.18,
  FAST: 0.28,
  STANDARD: 0.42,
  EMPHASIZED: 0.56,
  SURFACE: 0.48,
  FADE: 0.32,

  // Compatibility aliases
  INSTANT: 0.18,
  SNAPPY: 0.28,
  MODERATE: 0.42,
  CINEMATIC: 0.42,
  DEEP: 0.56,
  EPIC: 0.56,
  get COMPACT() {
    return this.STANDARD;
  },
});

export const NAV_CINEMATIC_DURATION = NAV_DURATIONS.STANDARD;

export const NAV_SPRINGS = Object.freeze({
  CARD: Object.freeze({ type: 'spring', stiffness: 170, damping: 22, mass: 0.9 }),
  LAYOUT: Object.freeze({ type: 'spring', stiffness: 150, damping: 20, mass: 0.95 }),
  PRESS: Object.freeze({ type: 'spring', stiffness: 420, damping: 28, mass: 0.55 }),
  FLOAT: Object.freeze({ type: 'spring', stiffness: 240, damping: 18, mass: 0.9 }),

  // Compatibility aliases
  get LUXURY_CARD() {
    return this.CARD;
  },
  get SILK_LAYOUT() {
    return this.LAYOUT;
  },
  get GENTLE_PRESS() {
    return this.PRESS;
  },
  get SUBTLE_FLOAT() {
    return this.FLOAT;
  },
});

export const NAV_STAGGER_TIMINGS = Object.freeze({
  MICRO: 0.018,
  FAST: 0.03,
  STANDARD: 0.045,
  RELAXED: 0.065,

  // Compatibility aliases
  DELIBERATE: 0.045,
  LUXURY_CASCADE: 0.065,
});

export const NAV_STAGGER_DELAY = NAV_STAGGER_TIMINGS.STANDARD;

export const NAV_TAP_SCALE = 0.992;
export const NAV_HOVER_SCALE = 1.006;

export const NAV_TAP_TRANSITION = NAV_SPRINGS.PRESS;
export const NAV_HOVER_TRANSITION = NAV_SPRINGS.FLOAT;

export const NAV_CINEMATIC_TRANSITION = Object.freeze({
  type: 'tween',
  duration: NAV_DURATIONS.STANDARD,
  ease: NAV_EASINGS.STANDARD,
});

// Genuine spring physics transition for card layout animation
export const NAV_CARD_SPRING = NAV_SPRINGS.CARD;
export const NAV_CARD_TRANSITION = NAV_CARD_SPRING;

export const NAV_HEIGHT_TRANSITION = NAV_CINEMATIC_TRANSITION;
export const NAV_COMPACT_HEIGHT_TRANSITION = NAV_CINEMATIC_TRANSITION;
export const NAV_SURFACE_TRANSITION = Object.freeze({
  type: 'tween',
  duration: NAV_DURATIONS.SURFACE,
  ease: NAV_EASINGS.STANDARD,
});

export const NAV_BACKDROP_TRANSITION = Object.freeze({
  type: 'tween',
  duration: NAV_DURATIONS.FAST,
  ease: NAV_EASINGS.SOFT,
});

export const NAV_FADE_TRANSITION = Object.freeze({
  type: 'tween',
  duration: NAV_DURATIONS.FADE,
  ease: NAV_EASINGS.STANDARD,
});

export const NAV_STAGGER_TRANSITION = Object.freeze({
  type: 'tween',
  duration: NAV_DURATIONS.STANDARD,
  ease: NAV_EASINGS.STANDARD,
});

export const NAV_MICRO_TRANSITION = Object.freeze({
  type: 'tween',
  duration: NAV_DURATIONS.MICRO,
  ease: NAV_EASINGS.EMPHASIZED,
});

export const NAV_BADGE_TRANSITION = Object.freeze({
  type: 'tween',
  duration: NAV_DURATIONS.FAST,
  ease: NAV_EASINGS.EMPHASIZED,
});

// Performance-optimized variants without GPU-heavy CSS blur filters
export const fadeVariants = Object.freeze({
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
});

export const slideFadeVariants = Object.freeze({
  hidden: { opacity: 0, y: 8, scale: 0.992 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 0.992 },
});

export const scaleFadeVariants = Object.freeze({
  hidden: { opacity: 0, scale: 0.992 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.992 },
});

export const staggerContainerVariants = Object.freeze({
  hidden: {},
  visible: {
    transition: {
      staggerChildren: NAV_STAGGER_TIMINGS.STANDARD,
    },
  },
  exit: {
    transition: {
      staggerChildren: NAV_STAGGER_TIMINGS.FAST,
      staggerDirection: -1,
    },
  },
});

export const staggerItemVariants = Object.freeze({
  hidden: { opacity: 0, y: 6, scale: 0.992 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 0.992 },
});

export function createStaggerVariants({
  staggerDelay = NAV_STAGGER_TIMINGS.STANDARD,
  delayChildren = 0,
  staggerDirection = 1,
} = {}) {
  return {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerDelay,
        delayChildren,
        staggerDirection,
      },
    },
    exit: {
      transition: {
        staggerChildren: staggerDelay * 0.5,
        staggerDirection: -1,
      },
    },
  };
}

export function createCinematicSlide({
  distance = 8,
  direction = 'y',
  opacity = true,
  scale = 1,
  scaleDelta = 0.008,
  blur = 0,
} = {}) {
  const initialOffset = { [direction]: distance };
  const exitOffset = { [direction]: -distance };
  const initialScale = scale !== 1 ? scale - scaleDelta : 1;

  return {
    hidden: {
      ...initialOffset,
      ...(opacity ? { opacity: 0 } : {}),
      ...(scale !== 1 ? { scale: initialScale } : {}),
      ...(blur > 0 ? { filter: `blur(${blur}px)` } : {}),
    },
    visible: {
      [direction]: 0,
      ...(opacity ? { opacity: 1 } : {}),
      ...(scale !== 1 ? { scale: 1 } : {}),
      ...(blur > 0 ? { filter: 'blur(0px)' } : {}),
    },
    exit: {
      ...exitOffset,
      ...(opacity ? { opacity: 0 } : {}),
      ...(scale !== 1 ? { scale: initialScale } : {}),
      ...(blur > 0 ? { filter: `blur(${blur}px)` } : {}),
    },
  };
}

export function isReducedMotionPreferred() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function getAccessibilityTransition(standardTransition) {
  if (isReducedMotionPreferred()) {
    return { type: 'tween', duration: 0.08, ease: 'linear' };
  }
  return standardTransition;
}
