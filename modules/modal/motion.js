const MODAL_EASINGS = Object.freeze({
  EMPHASIZED: [0.16, 1, 0.24, 1],
  SOFT: [0.35, 0.1, 0.15, 1],
  EXIT: [0.4, 0, 0.2, 1],
});

const MODAL_TIERS = Object.freeze({
  MICRO:    { duration: 0.28, distance: 10, scaleDelta: 0.02,  ease: MODAL_EASINGS.EMPHASIZED },
  FAST:     { duration: 0.42, distance: 16, scaleDelta: 0.05,  ease: MODAL_EASINGS.EMPHASIZED },
  STANDARD: { duration: 0.58, distance: 16, scaleDelta: 0.08,  ease: MODAL_EASINGS.EMPHASIZED },
  SURFACE:  { duration: 0.75, distance: 22, scaleDelta: 0.02,  ease: MODAL_EASINGS.EMPHASIZED },
});

const POSITIONS = Object.freeze({
  CENTER: 'center',
  BOTTOM: 'bottom',
  RIGHT: 'right',
  LEFT: 'left',
  TOP: 'top',
});

const MODAL_SPRINGS = Object.freeze({
  PANEL: Object.freeze({ type: 'spring', stiffness: 230, damping: 28, mass: 0.95 }),
  MICRO: Object.freeze({ type: 'spring', stiffness: 420, damping: 28, mass: 0.45 }),
});

export const MODAL_MICRO_SPRING = MODAL_SPRINGS.MICRO;

export const MODAL_MICRO_TAP_SCALE = 0.95;

function buildVariants(
  tierName,
  { axis, fullSlide = false, includeScale = false, direction = 1 } = {}
) {
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
      : (typeof signedDistance === 'number' ? signedDistance * 0.4 : signedDistance);
  }

  if (includeScale) {
    hidden.scale = 1 - tier.scaleDelta;
    visible.scale = 1;
    exit.scale = 1 - tier.scaleDelta * 0.5;
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
  includeScale: true,
});

const BOTTOM_VARIANTS = buildVariants('SURFACE', {
  axis: 'y',
  fullSlide: true,
  includeScale: true,
});

const RIGHT_VARIANTS = buildVariants('SURFACE', {
  axis: 'x',
  fullSlide: true,
  includeScale: true,
});

const LEFT_VARIANTS = buildVariants('SURFACE', {
  axis: 'x',
  fullSlide: true,
  includeScale: true,
  direction: -1,
});

const TOP_VARIANTS = buildVariants('SURFACE', {
  axis: 'y',
  fullSlide: true,
  includeScale: true,
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
