const MODAL_EASINGS = Object.freeze({
  EMPHASIZED: [0.22, 1, 0.36, 1],
  SOFT: [0.32, 0.72, 0, 1],
  EXIT: [0.4, 0, 0.2, 1],
});

const MODAL_TIERS = Object.freeze({
  MICRO: { duration: 0.24, distance: 4, ease: MODAL_EASINGS.EMPHASIZED },
  FAST: { duration: 0.42, distance: 8, ease: MODAL_EASINGS.EMPHASIZED },
  STANDARD: { duration: 0.64, distance: 14, ease: MODAL_EASINGS.EMPHASIZED },
  SURFACE: { duration: 0.82, distance: 18, ease: MODAL_EASINGS.EMPHASIZED },
});

const POSITIONS = Object.freeze({
  CENTER: 'center',
  BOTTOM: 'bottom',
  RIGHT: 'right',
  LEFT: 'left',
  TOP: 'top',
});

const MODAL_SPRINGS = Object.freeze({
  MICRO: Object.freeze({ type: 'spring', stiffness: 420, damping: 28, mass: 0.45 }),
});

export const MODAL_MICRO_SPRING = MODAL_SPRINGS.MICRO;

// Keep press feedback aligned with the Nav controls: noticeable, but never bouncy.
export const MODAL_MICRO_TAP_SCALE = 0.97;

export const MODAL_CONTENT_STAGGER = 0.045;

export const MODAL_CONTENT_VARIANTS = Object.freeze({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: MODAL_TIERS.FAST.duration, ease: MODAL_EASINGS.SOFT, delay: 0.1 },
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
    transition: { duration: MODAL_TIERS.FAST.duration, ease: MODAL_EASINGS.SOFT, delay: 0.04 },
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
    transition: { duration: MODAL_TIERS.FAST.duration, ease: MODAL_EASINGS.SOFT, delay: 0.16 },
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
    transition: { duration: MODAL_TIERS.MICRO.duration, ease: MODAL_EASINGS.SOFT },
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
      ease: MODAL_EASINGS.EMPHASIZED,
      delay: 0.08 + Math.min(Math.max(index, 0) * MODAL_CONTENT_STAGGER, 0.32),
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
    transition: { duration: tier.duration * 0.65, ease: MODAL_EASINGS.EXIT },
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

export const modalBackdropVariants = Object.freeze({
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: MODAL_TIERS.SURFACE.duration * 0.65,
      ease: MODAL_EASINGS.EMPHASIZED,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: MODAL_TIERS.SURFACE.duration * 0.45,
      ease: MODAL_EASINGS.EXIT,
    },
  },
});

const CENTER_VARIANTS = buildVariants('STANDARD', {
  axis: 'y',
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
