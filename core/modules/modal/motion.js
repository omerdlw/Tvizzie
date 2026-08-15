const MODAL_EASINGS = Object.freeze({
  // Aligned with nav CINEMATIC easing
  CINEMATIC: [0.16, 1, 0.3, 1],
  EMPHASIZED: [0.22, 1, 0.36, 1],
  EXIT: [0.35, 0, 0.2, 1],
});

const MODAL_TIERS = Object.freeze({
  MICRO: { duration: 0.22, distance: 4, ease: MODAL_EASINGS.CINEMATIC },
  FAST: { duration: 0.38, distance: 8, ease: MODAL_EASINGS.CINEMATIC },
  STANDARD: { duration: 0.58, distance: 12, ease: MODAL_EASINGS.CINEMATIC },
  SURFACE: { duration: 0.72, distance: 16, ease: MODAL_EASINGS.CINEMATIC },
});

const POSITIONS = Object.freeze({
  CENTER: 'center',
  BOTTOM: 'bottom',
  RIGHT: 'right',
  LEFT: 'left',
  TOP: 'top',
});

const MODAL_SPRINGS = Object.freeze({
  // Button tap: crisp, instant
  MICRO: Object.freeze({ type: 'spring', stiffness: 600, damping: 28, mass: 0.22 }),
  // Panel enter: organic feel aligned with nav DECK spring
  PANEL: Object.freeze({ type: 'spring', stiffness: 280, damping: 28, mass: 0.6 }),
  // Badge / counter
  BADGE: Object.freeze({ type: 'spring', stiffness: 460, damping: 18, mass: 0.32 }),
});

export const MODAL_MICRO_SPRING = MODAL_SPRINGS.MICRO;
export const MODAL_PANEL_SPRING = MODAL_SPRINGS.PANEL;

// Keep press feedback aligned with the Nav controls: noticeable, but never bouncy.
export const MODAL_MICRO_TAP_SCALE = 0.97;

export const MODAL_CONTENT_STAGGER = 0.04;

export const MODAL_CONTENT_VARIANTS = Object.freeze({
  hidden: { opacity: 0, y: 4 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: MODAL_TIERS.FAST.duration, ease: MODAL_EASINGS.CINEMATIC, delay: 0.08 },
  },
  exit: {
    opacity: 0,
    transition: { duration: MODAL_TIERS.MICRO.duration, ease: MODAL_EASINGS.EXIT },
  },
});

export const MODAL_HEADER_VARIANTS = Object.freeze({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: MODAL_TIERS.FAST.duration, ease: MODAL_EASINGS.CINEMATIC, delay: 0.03 },
  },
  exit: {
    opacity: 0,
    transition: { duration: MODAL_TIERS.MICRO.duration, ease: MODAL_EASINGS.EXIT },
  },
});

export const MODAL_FOOTER_VARIANTS = Object.freeze({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: MODAL_TIERS.FAST.duration, ease: MODAL_EASINGS.CINEMATIC, delay: 0.12 },
  },
  exit: {
    opacity: 0,
    transition: { duration: MODAL_TIERS.MICRO.duration, ease: MODAL_EASINGS.EXIT },
  },
});

export const MODAL_LIST_VARIANTS = Object.freeze({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: MODAL_TIERS.MICRO.duration, ease: MODAL_EASINGS.CINEMATIC },
  },
  exit: {
    opacity: 0,
    transition: { duration: MODAL_TIERS.MICRO.duration, ease: MODAL_EASINGS.EXIT },
  },
});

export const MODAL_LIST_ITEM_VARIANTS = Object.freeze({
  hidden: { opacity: 0, y: MODAL_TIERS.FAST.distance },
  visible: (index = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: MODAL_TIERS.FAST.duration,
      ease: MODAL_EASINGS.CINEMATIC,
      delay: 0.06 + Math.min(Math.max(index, 0) * MODAL_CONTENT_STAGGER, 0.28),
    },
  }),
  exit: {
    opacity: 0,
    y: -MODAL_TIERS.MICRO.distance,
    transition: { duration: MODAL_TIERS.MICRO.duration, ease: MODAL_EASINGS.EXIT },
  },
});

function buildVariants(tierName, { axis, fullSlide = false, direction = 1 } = {}) {
  const tier = MODAL_TIERS[tierName];
  const distance = fullSlide ? '100%' : tier.distance;
  const signedDistance = direction < 0 ? (fullSlide ? '-100%' : -distance) : distance;

  const hidden = { opacity: 0 };
  const visible = {
    opacity: 1,
    transition: { duration: tier.duration, ease: tier.ease },
  };
  const exit = {
    opacity: 0,
    transition: { duration: tier.duration * 0.6, ease: MODAL_EASINGS.EXIT },
  };

  if (axis) {
    hidden[axis] = signedDistance;
    visible[axis] = 0;
    exit[axis] = fullSlide
      ? signedDistance
      : typeof signedDistance === 'number'
        ? signedDistance * 0.4
        : signedDistance;
  }

  return Object.freeze({ hidden, visible, exit });
}

// Backdrop: blur is driven via inline filter so framer-motion can interpolate it.
// CSS class `backdrop-blur-sm` cannot be animated — it snaps on at frame 1.
export const modalBackdropVariants = Object.freeze({
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: MODAL_TIERS.FAST.duration,
      ease: MODAL_EASINGS.CINEMATIC,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: MODAL_TIERS.MICRO.duration,
      ease: MODAL_EASINGS.EXIT,
    },
  },
});

// Center modal: scale up + small y lift so it feels like it "rises" into place.
// The PANEL spring in index.js drives the actual physics.
const CENTER_VARIANTS = Object.freeze({
  hidden: { opacity: 0, scale: 0.94, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 6,
    transition: { duration: MODAL_TIERS.FAST.duration * 0.6, ease: MODAL_EASINGS.EXIT },
  },
});


const BOTTOM_VARIANTS = buildVariants('SURFACE', {
  axis: 'y',
  fullSlide: true,
});

const RIGHT_VARIANTS = buildVariants('SURFACE', {
  axis: 'x',
  fullSlide: true,
});

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
    case POSITIONS.BOTTOM:
      return BOTTOM_VARIANTS;
    case POSITIONS.RIGHT:
      return RIGHT_VARIANTS;
    case POSITIONS.LEFT:
      return LEFT_VARIANTS;
    case POSITIONS.TOP:
      return TOP_VARIANTS;
    case POSITIONS.CENTER:
    default:
      return CENTER_VARIANTS;
  }
}
