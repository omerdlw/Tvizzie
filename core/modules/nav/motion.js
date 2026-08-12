const NAV_EASINGS = Object.freeze({
  EMPHASIZED: [0.22, 1, 0.36, 1],
  SOFT: [0.32, 0.72, 0, 1],
  EXIT: [0.4, 0, 0.2, 1],
});

const NAV_TIERS = Object.freeze({
  MICRO: { duration: 0.24, distance: 4, scaleDelta: 0.006, ease: NAV_EASINGS.EMPHASIZED },
  FAST: { duration: 0.42, distance: 8, scaleDelta: 0.01, ease: NAV_EASINGS.EMPHASIZED },
  STANDARD: { duration: 0.64, distance: 14, scaleDelta: 0.014, ease: NAV_EASINGS.EMPHASIZED },
  SURFACE: { duration: 0.82, distance: 18, scaleDelta: 0.018, ease: NAV_EASINGS.EMPHASIZED },
});

const NAV_SPRINGS = Object.freeze({
  PRESS: Object.freeze({ type: 'spring', stiffness: 520, damping: 34, mass: 0.32 }),
  BADGE: Object.freeze({ type: 'spring', stiffness: 340, damping: 26, mass: 0.45 }),
});

const NAV_STAGGER_TIMINGS = Object.freeze({
  STANDARD: 0.055,
  FAST: 0.04,
});

export const NAV_STAGGER_DELAY = NAV_STAGGER_TIMINGS.STANDARD;
export const NAV_TAP_SCALE = 0.97;

export const NAV_BUTTON_TRANSITION = NAV_SPRINGS.PRESS;
export const NAV_CARD_SPRING = Object.freeze({
  type: 'tween',
  duration: NAV_TIERS.STANDARD.duration,
  ease: NAV_EASINGS.EMPHASIZED,
});
export const NAV_SURFACE_TRANSITION = Object.freeze({
  type: 'tween',
  duration: NAV_TIERS.SURFACE.duration,
  ease: NAV_EASINGS.EMPHASIZED,
});

export const NAV_BACKDROP_TRANSITION = Object.freeze({
  type: 'tween',
  duration: NAV_TIERS.SURFACE.duration * 0.55,
  ease: NAV_EASINGS.SOFT,
});

export const NAV_FADE_TRANSITION = Object.freeze({
  type: 'tween',
  duration: NAV_TIERS.STANDARD.duration * 0.7,
  ease: NAV_EASINGS.SOFT,
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

export const NAV_ACTIVE_INDICATOR_TRANSITION = Object.freeze({
  type: 'tween',
  duration: NAV_TIERS.FAST.duration,
  ease: NAV_EASINGS.EMPHASIZED,
});

export const NAV_RESULTS_TRANSITION = Object.freeze({
  type: 'tween',
  duration: NAV_TIERS.STANDARD.duration,
  ease: NAV_EASINGS.EMPHASIZED,
});

export const NAV_RESULTS_EXIT_TRANSITION = Object.freeze({
  type: 'tween',
  duration: NAV_TIERS.FAST.duration,
  ease: NAV_EASINGS.EXIT,
});

export const NAV_RESULTS_STAGGER_DELAY = 0.07;

// Surface state changes begin only after the compact stack has settled, and the
// compact lock is released after the surface exit has fully completed.
export const NAV_COMPACT_TO_SURFACE_DELAY_MS = 420;
export const NAV_SURFACE_EXIT_SETTLE_MS = 560;

function buildVariants(
  tierName,
  { includeY = false, includeScale = false, direction = 'y', distanceScale = 1 } = {},
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

// The surface shell contains text. Keep its reveal opacity-only so glyphs remain
// rasterised at their final size and position throughout the transition.
export const slideFadeVariants = buildVariants('SURFACE');

// Text is intentionally opacity-only. Moving or scaling glyphs produces visibly different
// rasterisation across Windows DPI/scaling combinations.
export const textCrossfadeVariants = buildVariants('STANDARD');

// Toolbar actions contain icon-only controls, so a small positional reveal is safe here.
export const staggerItemVariants = buildVariants('FAST', { includeY: true });
