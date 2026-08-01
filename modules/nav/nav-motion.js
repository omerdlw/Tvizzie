const NAV_EASINGS = Object.freeze({
  EMPHASIZED: [0.16, 1, 0.24, 1],
  SOFT: [0.35, 0.1, 0.15, 1],
  EXIT: [0.4, 0, 0.2, 1],
});

const NAV_TIERS = Object.freeze({
  MICRO:      { duration: 0.28, distance: 6,  scaleDelta: 0.008, ease: NAV_EASINGS.EMPHASIZED },
  FAST:       { duration: 0.42, distance: 10, scaleDelta: 0.012, ease: NAV_EASINGS.EMPHASIZED },
  STANDARD:   { duration: 0.60, distance: 16, scaleDelta: 0.018, ease: NAV_EASINGS.EMPHASIZED },
  SURFACE:    { duration: 0.75, distance: 22, scaleDelta: 0.022, ease: NAV_EASINGS.EMPHASIZED },
});

const NAV_SPRINGS = Object.freeze({
  CARD:    Object.freeze({ type: 'spring', stiffness: 160, damping: 24, mass: 0.95 }),
  SURFACE: Object.freeze({ type: 'spring', stiffness: 180, damping: 26, mass: 1.0 }),
  PRESS:   Object.freeze({ type: 'spring', stiffness: 420, damping: 28, mass: 0.45 }),
  BADGE:   Object.freeze({ type: 'spring', stiffness: 280, damping: 22, mass: 0.55 }),
});

const NAV_STAGGER_TIMINGS = Object.freeze({
  STANDARD: 0.035,
  FAST: 0.025,
});

export const NAV_STAGGER_DELAY = NAV_STAGGER_TIMINGS.STANDARD;
export const NAV_TAP_SCALE = 0.985;

export const NAV_BUTTON_TRANSITION = NAV_SPRINGS.PRESS;
export const NAV_CARD_SPRING = NAV_SPRINGS.CARD;
export const NAV_SURFACE_TRANSITION = NAV_SPRINGS.SURFACE;

export const NAV_BACKDROP_TRANSITION = Object.freeze({
  type: 'tween',
  duration: NAV_TIERS.SURFACE.duration * 0.55,
  ease: NAV_EASINGS.SOFT,
});

export const NAV_FADE_TRANSITION = Object.freeze({
  type: 'tween',
  duration: NAV_TIERS.FAST.duration,
  ease: NAV_TIERS.FAST.ease,
});

export const NAV_STAGGER_TRANSITION = Object.freeze({
  type: 'tween',
  duration: NAV_TIERS.FAST.duration,
  ease: NAV_TIERS.FAST.ease,
});

export const NAV_MICRO_TRANSITION = Object.freeze({
  type: 'tween',
  duration: NAV_TIERS.MICRO.duration,
  ease: NAV_TIERS.MICRO.ease,
});

export const NAV_BADGE_TRANSITION = NAV_SPRINGS.BADGE;

function buildVariants(
  tierName,
  { includeY = false, includeScale = false, direction = 'y', distanceScale = 1 } = {}
) {
  const tier = NAV_TIERS[tierName];
  const distance = tier.distance * distanceScale;

  const hidden = { opacity: 0 };
  const visible = {
    opacity: 1,
    transition: { duration: tier.duration, ease: tier.ease },
  };
  const exit = {
    opacity: 0,
    transition: { duration: tier.duration * 0.65, ease: NAV_EASINGS.EXIT },
  };

  if (includeY) {
    hidden[direction] = distance;
    visible[direction] = 0;
    exit[direction] = -distance * 0.4;
  }
  if (includeScale) {
    hidden.scale = 1 - tier.scaleDelta;
    visible.scale = 1;
    exit.scale = 1 - tier.scaleDelta * 0.5;
  }

  return Object.freeze({ hidden, visible, exit });
}

export const slideFadeVariants = buildVariants('STANDARD', { includeY: true, includeScale: true });

export const textCrossfadeVariants = buildVariants('STANDARD', {
  includeY: true,
  blurScale: 0,
  distanceScale: 0.5,
});

export const staggerItemVariants = buildVariants('FAST', { includeY: true, includeScale: true });