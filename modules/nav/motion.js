import { MOTION_EASINGS, MOTION_SPRINGS } from '@/shared';

const NAV_EASINGS = Object.freeze({
  CINEMATIC: MOTION_EASINGS.CINEMATIC,
  EMPHASIZED: MOTION_EASINGS.EMPHASIZED,
  SOFT: MOTION_EASINGS.SOFT,
  EXIT: MOTION_EASINGS.EXIT,
});

const NAV_TIERS = Object.freeze({
  MICRO: {
    duration: 0.24,
    distance: 4,
    scaleDelta: 0.008,
    ease: NAV_EASINGS.EMPHASIZED,
  },

  FAST: {
    duration: 0.44,
    distance: 9,
    scaleDelta: 0.012,
    ease: NAV_EASINGS.EMPHASIZED,
  },

  STANDARD: {
    duration: 0.66,
    distance: 18,
    scaleDelta: 0.018,
    ease: NAV_EASINGS.SOFT,
  },

  SURFACE: {
    duration: 0.96,
    distance: 28,
    scaleDelta: 0.024,
    ease: NAV_EASINGS.CINEMATIC,
  },
});

const NAV_SPRINGS = Object.freeze({
  PRESS: MOTION_SPRINGS.PRESS,
  BADGE: MOTION_SPRINGS.BADGE,
  DECK: MOTION_SPRINGS.PANEL,

  PEEK: Object.freeze({
    type: 'spring',
    stiffness: 150,
    damping: 22,
    mass: 0.85,
  }),
});

const NAV_STAGGER_TIMINGS = Object.freeze({
  EXPAND: 0.068,
  COLLAPSE: 0.042,
  PEEK: 0.078,
  STANDARD: 0.06,
  FAST: 0.042,
});

const NAV_STAGGER_DELAY = NAV_STAGGER_TIMINGS.STANDARD;

/**
 * Scale applied while pressing navigation controls.
 * @type {number}
 */
const NAV_TAP_SCALE = 0.98;

/**
 * Shared spring transition for navigation controls.
 * @type {Readonly<object>}
 */
const NAV_BUTTON_TRANSITION = NAV_SPRINGS.PRESS;

/**
 * Shared spring transition for navigation cards.
 * @type {Readonly<object>}
 */
const NAV_CARD_SPRING = NAV_SPRINGS.DECK;

const NAV_CARD_EXPAND_TRANSITION = Object.freeze({
  type: 'tween',
  duration: 0.84,
  ease: NAV_EASINGS.CINEMATIC,
});

const NAV_STACK_TRANSITION = Object.freeze({
  type: 'tween',
  duration: NAV_TIERS.STANDARD.duration,
  ease: NAV_EASINGS.SOFT,
});

const NAV_CARD_TRANSITION = Object.freeze({
  type: 'tween',
  duration: NAV_TIERS.STANDARD.duration,
  ease: NAV_EASINGS.EMPHASIZED,
});

const NAV_CARD_COLLAPSE_TRANSITION = Object.freeze({
  type: 'tween',
  duration: 0.62,
  ease: NAV_EASINGS.EXIT,
});

const NAV_PEEK_SPRING = NAV_SPRINGS.PEEK;

const NAV_SURFACE_TRANSITION = Object.freeze({
  type: 'tween',
  duration: NAV_TIERS.SURFACE.duration,
  ease: NAV_EASINGS.CINEMATIC,
});

const NAV_BACKDROP_TRANSITION = Object.freeze({
  type: 'tween',
  duration: 0.66,
  ease: NAV_EASINGS.SOFT,
});

/**
 * Shared transition for navigation fades.
 * @type {Readonly<object>}
 */
const NAV_FADE_TRANSITION = Object.freeze({
  type: 'tween',
  duration: NAV_TIERS.STANDARD.duration,
  ease: NAV_EASINGS.EMPHASIZED,
});

const NAV_TEXT_ENTER_TRANSITION = Object.freeze({
  type: 'tween',
  duration: 0.62,
  ease: NAV_EASINGS.EMPHASIZED,
});

const NAV_TEXT_EXIT_TRANSITION = Object.freeze({
  type: 'tween',
  duration: 0.38,
  ease: NAV_EASINGS.EXIT,
});

const NAV_ICON_TRANSITION = Object.freeze({
  type: 'tween',
  duration: 0.48,
  ease: NAV_EASINGS.SOFT,
});

const NAV_STAGGER_TRANSITION = Object.freeze({
  type: 'tween',
  duration: 0.62,
  ease: NAV_EASINGS.EMPHASIZED,
});

/**
 * Short transition for navigation micro-interactions.
 * @type {Readonly<object>}
 */
const NAV_MICRO_TRANSITION = Object.freeze({
  type: 'tween',
  duration: NAV_TIERS.MICRO.duration,
  ease: NAV_TIERS.MICRO.ease,
});

const NAV_BADGE_TRANSITION = NAV_SPRINGS.BADGE;

const NAV_ACTIVE_INDICATOR_TRANSITION = Object.freeze({
  type: 'tween',
  duration: 0.48,
  ease: NAV_EASINGS.SOFT,
});

/**
 * Entrance transition for navigation search results.
 * @type {Readonly<object>}
 */
const NAV_RESULTS_TRANSITION = Object.freeze({
  type: 'tween',
  duration: 0.79,
  ease: NAV_EASINGS.CINEMATIC,
});

/**
 * Exit transition for navigation search results.
 * @type {Readonly<object>}
 */
const NAV_RESULTS_EXIT_TRANSITION = Object.freeze({
  type: 'tween',
  duration: 0.48,
  ease: NAV_EASINGS.EXIT,
});

/**
 * Delay between navigation search-result entrances.
 * @type {number}
 */
const NAV_RESULTS_STAGGER_DELAY = NAV_STAGGER_TIMINGS.STANDARD;

const NAV_PEEK_TRANSITION = Object.freeze({
  type: 'tween',
  duration: 0.72,
  ease: NAV_EASINGS.SOFT,
});

const NAV_SURFACE_DRAG_CONSTRAINTS = Object.freeze({
  top: 0,
  bottom: 0,
});

const NAV_SURFACE_DRAG_ELASTIC = Object.freeze({
  top: 0.05,
  bottom: 0.5,
});

const NAV_BREADCRUMBS_TRANSITION = Object.freeze({
  type: 'tween',
  duration: 0.57,
  ease: NAV_EASINGS.EMPHASIZED,
});

const NAV_HUD_TRANSITION = NAV_FADE_TRANSITION;

function toGpuTransform(y = 0, scale = 1) {
  const safeY = Number(y);
  const safeScale = Number(scale);

  return `translate3d(0, ${
    Number.isFinite(safeY) ? safeY : 0
  }px, 0) scale(${Number.isFinite(safeScale) ? safeScale : 1})`;
}

/**
 * Motion variants for navigation action controls.
 * @type {Readonly<object>}
 */
const navActionVariants = Object.freeze({
  idle: {
    transform: toGpuTransform(0, 1),
  },
  hover: {
    transform: toGpuTransform(0, 1.02),
  },
  tap: {
    transform: toGpuTransform(0, NAV_TAP_SCALE),
  },
});

function getNavActionMotionProps({ disabled = false, reduceMotion = false } = {}) {
  const canMove = !disabled && !reduceMotion;

  return {
    initial: false,
    animate: 'idle',
    whileHover: canMove ? 'hover' : undefined,
    whileTap: canMove ? 'tap' : undefined,
    variants: navActionVariants,
    transition: NAV_BUTTON_TRANSITION,
  };
}

function buildVariants(tierName, { distanceScale = 0, blur = 0 } = {}) {
  const tier = NAV_TIERS[tierName];
  const distance = tier.distance * distanceScale;

  const hidden = {
    opacity: 0,
    ...(blur > 0 ? { filter: `blur(${blur}px)` } : {}),
  };

  const visible = {
    opacity: 1,
    ...(blur > 0 ? { filter: 'blur(0px)' } : {}),
    transition: {
      duration: tier.duration,
      ease: tier.ease,
    },
  };

  const exit = {
    opacity: 0,
    ...(blur > 0 ? { filter: `blur(${Math.max(blur * 0.6, 3)}px)` } : {}),
    transition: {
      duration: tier.duration * 0.72,
      ease: NAV_EASINGS.EXIT,
    },
  };

  if (distance) {
    hidden.transform = toGpuTransform(distance, 1 - tier.scaleDelta);

    visible.transform = toGpuTransform(0);

    exit.transform = toGpuTransform(distance * 0.72, 1 - tier.scaleDelta * 0.6);
  }

  return Object.freeze({
    hidden,
    visible,
    exit,
  });
}

/**
 * Motion variants for surface slide-and-fade transitions.
 * @type {Readonly<object>}
 */
const slideFadeVariants = buildVariants('SURFACE', {
  distanceScale: 0,
  blur: 8,
});

/**
 * Motion variants for navigation text crossfades.
 * @type {Readonly<object>}
 */
const textCrossfadeVariants = buildVariants('STANDARD', {
  distanceScale: 0.42,
  blur: 5,
});

const staggerItemVariants = buildVariants('FAST', {
  distanceScale: 0.75,
  blur: 6,
});

/**
 * Motion variants for staggered navigation list items.
 * @type {Readonly<object>}
 */
const navListItemVariants = Object.freeze({
  hidden: staggerItemVariants.hidden,

  visible: (index = 0) => ({
    ...staggerItemVariants.visible,
    transition: {
      ...NAV_STAGGER_TRANSITION,
      delay: Math.min(Math.max(Number(index) || 0, 0) * NAV_STAGGER_TIMINGS.STANDARD, 0.42),
    },
  }),

  exit: {
    ...staggerItemVariants.exit,

    transition: {
      ...NAV_TEXT_EXIT_TRANSITION,
    },
  },
});

/**
 * Motion variants for general navigation content fades.
 * @type {Readonly<object>}
 */
const navFadeVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(12, 0.978),
    filter: 'blur(5px)',
  },

  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
    filter: 'blur(0px)',
  },

  exit: {
    opacity: 0,
    transform: toGpuTransform(8, 0.988),
    filter: 'blur(4px)',
  },
});

const navBadgeVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(0, 0.78),
    filter: 'blur(4px)',
  },

  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
    filter: 'blur(0px)',
  },

  exit: {
    opacity: 0,
    transform: toGpuTransform(0, 0.82),
    filter: 'blur(3px)',
  },
});

const navBackdropVariants = Object.freeze({
  hidden: {
    opacity: 0,
  },

  visible: {
    opacity: 1,
  },

  exit: {
    opacity: 0,
  },
});

const navBreadcrumbsVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(-10, 0.96),
    filter: 'blur(5px)',
  },

  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
    filter: 'blur(0px)',
  },

  exit: {
    opacity: 0,
    transform: toGpuTransform(-6, 0.98),
    filter: 'blur(4px)',
  },
});

const navHudVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(10, 0.975),
    filter: 'blur(5px)',
  },

  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
    filter: 'blur(0px)',
  },

  exit: {
    opacity: 0,
    transform: toGpuTransform(8, 0.985),
    filter: 'blur(4px)',
  },
});

function getNavDescriptionVariants(targetOpacity = 0.7) {
  return {
    hidden: {
      opacity: 0,
      transform: toGpuTransform(8, 0.99),
      filter: 'blur(4px)',
    },

    visible: {
      opacity: targetOpacity,
      transform: toGpuTransform(0),
      filter: 'blur(0px)',
      transition: {
        duration: 0.62,
        ease: NAV_EASINGS.EMPHASIZED,
      },
    },

    exit: {
      opacity: 0,
      transform: toGpuTransform(5, 0.99),
      filter: 'blur(3px)',
      transition: {
        duration: 0.38,
        ease: NAV_EASINGS.EXIT,
      },
    },
  };
}

function getNavActionStaggerTransition(index = 0) {
  return {
    ...NAV_STAGGER_TRANSITION,
    delay: Math.min(Math.max(Number(index) || 0, 0) * NAV_STAGGER_DELAY, 0.42),
  };
}

function getNavStackAnimateProps({
  width,
  height,
  isBreadcrumbsVisible = false,
  isFullscreen = false,
}) {
  const safeWidth = Number(width);
  const safeHeight = Number(height);
  return {
    width: Math.max(0, Math.round(Number.isFinite(safeWidth) ? safeWidth : 0)),
    height: Math.max(0, Math.round(Number.isFinite(safeHeight) ? safeHeight : 0)),

    transform: toGpuTransform(isBreadcrumbsVisible ? -48 : 0),

    opacity: isFullscreen ? 0 : 1,

    pointerEvents: isFullscreen ? 'none' : 'auto',
  };
}

function getNavCardDelay({ expanded = false, isStackHovered = false, position = 0 } = {}) {
  const safePosition = Math.max(0, Number(position) || 0);

  if (expanded && safePosition > 0) {
    return Math.min(safePosition * NAV_STAGGER_TIMINGS.EXPAND, 0.42);
  }

  if (isStackHovered && safePosition > 0) {
    return Math.min((safePosition - 1) * NAV_STAGGER_TIMINGS.PEEK, 0.32);
  }

  return 0;
}

function getNavItemAnimateValues({ motionValues, isStackHovered = false, position = 0 } = {}) {
  if (!motionValues) return {};

  const safePosition = Math.max(0, Number(position) || 0);

  const isHoveredOffset = isStackHovered && safePosition > 0;

  const peekProgress = Math.min(safePosition / 3, 1);

  const peekOffset = NAV_TIERS.MICRO.distance * (0.85 + peekProgress * 0.35);

  const peekScale = NAV_TIERS.MICRO.scaleDelta * (1 - peekProgress * 0.25);

  const y = isHoveredOffset ? motionValues.y - safePosition * peekOffset : motionValues.y;

  const scale = isHoveredOffset ? motionValues.scale * (1 + peekScale) : motionValues.scale;

  return {
    transform: toGpuTransform(y, scale),
    opacity: motionValues.opacity,
  };
}

function getNavItemTransition({ isStackHovered = false, position = 0, delay = 0 } = {}) {
  const baseTransition = isStackHovered && position > 0 ? NAV_PEEK_TRANSITION : NAV_CARD_TRANSITION;

  return {
    ...baseTransition,
    delay,
  };
}

function getNavCardContentAnimateProps({ compact = false, expanded = false, position = 0 } = {}) {
  const isHidden = compact || (!expanded && position > 0);

  return {
    opacity: isHidden ? 0 : 1,

    transform: toGpuTransform(
      isHidden ? NAV_TIERS.STANDARD.distance * 0.35 : 0,

      isHidden ? 1 - NAV_TIERS.MICRO.scaleDelta : 1,
    ),

    filter: isHidden ? 'blur(5px)' : 'blur(0px)',
  };
}

function getNavScrollProgressStyle(progress = 0) {
  const safeProgress = Math.min(Math.max(Number(progress) || 0, 0), 1);

  return {
    width: '100%',
    transformOrigin: 'left center',
    transform: `scaleX(${safeProgress})`,
  };
}

const navSoundwaveBarVariants = Object.freeze({
  playing: (index) => ({
    transform: [
      toGpuTransform(0, 0.3),
      toGpuTransform(0, 1),
      toGpuTransform(0, 0.42),
      toGpuTransform(0, 0.92),
      toGpuTransform(0, 0.3),
    ],

    transition: {
      duration: 1.28,
      repeat: Infinity,
      ease: NAV_EASINGS.SOFT,
      delay: Number(index) * 0.18,
    },
  }),

  paused: {
    transform: toGpuTransform(0, 0.3),

    transition: {
      duration: 0.44,
      ease: NAV_EASINGS.EXIT,
    },
  },
});

const navScrubberTooltipVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(8, 0.94),
    filter: 'blur(5px)',
  },

  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
    filter: 'blur(0px)',
  },

  exit: {
    opacity: 0,
    transform: toGpuTransform(6, 0.96),
    filter: 'blur(4px)',
  },
});

const NAV_SCRUBBER_TOOLTIP_TRANSITION = Object.freeze({
  type: 'tween',
  duration: 0.31,
  ease: NAV_EASINGS.EMPHASIZED,
});
const NAV_COMPACT_TO_SURFACE_DELAY_MS = 380;
const NAV_SURFACE_HEADER_REVEAL_DELAY_MS = 220;
const NAV_SURFACE_EXIT_SETTLE_MS = 520;

export {
  NAV_EASINGS,
  NAV_TIERS,
  NAV_SPRINGS,
  NAV_STAGGER_TIMINGS,
  NAV_STAGGER_DELAY,
  NAV_TAP_SCALE,
  NAV_BUTTON_TRANSITION,
  NAV_CARD_SPRING,
  NAV_CARD_EXPAND_TRANSITION,
  NAV_STACK_TRANSITION,
  NAV_CARD_TRANSITION,
  NAV_CARD_COLLAPSE_TRANSITION,
  NAV_PEEK_SPRING,
  NAV_SURFACE_TRANSITION,
  NAV_BACKDROP_TRANSITION,
  NAV_FADE_TRANSITION,
  NAV_TEXT_ENTER_TRANSITION,
  NAV_TEXT_EXIT_TRANSITION,
  NAV_ICON_TRANSITION,
  NAV_STAGGER_TRANSITION,
  NAV_MICRO_TRANSITION,
  NAV_BADGE_TRANSITION,
  NAV_ACTIVE_INDICATOR_TRANSITION,
  NAV_RESULTS_TRANSITION,
  NAV_RESULTS_EXIT_TRANSITION,
  NAV_RESULTS_STAGGER_DELAY,
  NAV_PEEK_TRANSITION,
  NAV_SURFACE_DRAG_CONSTRAINTS,
  NAV_SURFACE_DRAG_ELASTIC,
  NAV_BREADCRUMBS_TRANSITION,
  NAV_HUD_TRANSITION,
  toGpuTransform,
  navActionVariants,
  getNavActionMotionProps,
  slideFadeVariants,
  textCrossfadeVariants,
  staggerItemVariants,
  navListItemVariants,
  navFadeVariants,
  navBadgeVariants,
  navBackdropVariants,
  navBreadcrumbsVariants,
  navHudVariants,
  getNavDescriptionVariants,
  getNavActionStaggerTransition,
  getNavStackAnimateProps,
  getNavCardDelay,
  getNavItemAnimateValues,
  getNavItemTransition,
  getNavCardContentAnimateProps,
  getNavScrollProgressStyle,
  navSoundwaveBarVariants,
  navScrubberTooltipVariants,
  NAV_SCRUBBER_TOOLTIP_TRANSITION,
  NAV_COMPACT_TO_SURFACE_DELAY_MS,
  NAV_SURFACE_HEADER_REVEAL_DELAY_MS,
  NAV_SURFACE_EXIT_SETTLE_MS,
};
