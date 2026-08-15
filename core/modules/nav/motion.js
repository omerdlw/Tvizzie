const NAV_EASINGS = Object.freeze({
  CINEMATIC: [0.16, 1, 0.3, 1],
  EMPHASIZED: [0.2, 0.95, 0.3, 1],
  SOFT: [0.25, 0.85, 0.25, 1],
  EXIT: [0.35, 0, 0.2, 1],
});

const NAV_TIERS = Object.freeze({
  MICRO: { duration: 0.22, distance: 4, scaleDelta: 0.008, ease: NAV_EASINGS.CINEMATIC },
  FAST: { duration: 0.38, distance: 8, scaleDelta: 0.012, ease: NAV_EASINGS.CINEMATIC },
  STANDARD: { duration: 0.58, distance: 12, scaleDelta: 0.016, ease: NAV_EASINGS.CINEMATIC },
  SURFACE: { duration: 0.78, distance: 16, scaleDelta: 0.018, ease: NAV_EASINGS.CINEMATIC },
});

const NAV_SPRINGS = Object.freeze({
  PRESS: Object.freeze({ type: 'spring', stiffness: 600, damping: 28, mass: 0.22 }),
  BADGE: Object.freeze({ type: 'spring', stiffness: 460, damping: 18, mass: 0.32 }),
  DECK: Object.freeze({ type: 'spring', stiffness: 280, damping: 28, mass: 0.6 }),
  PEEK: Object.freeze({ type: 'spring', stiffness: 240, damping: 22, mass: 0.7 }),
});

const NAV_STAGGER_TIMINGS = Object.freeze({
  EXPAND: 0.038,
  COLLAPSE: 0.024,
  PEEK: 0.045,
  STANDARD: 0.045,
  FAST: 0.032,
});

export const NAV_STAGGER_DELAY = NAV_STAGGER_TIMINGS.STANDARD;
export const NAV_TAP_SCALE = 0.96;
export const NAV_BUTTON_TRANSITION = NAV_SPRINGS.PRESS;
export const NAV_CARD_SPRING = NAV_SPRINGS.DECK;
export const NAV_CARD_EXPAND_TRANSITION = NAV_SPRINGS.DECK;

export const NAV_CARD_COLLAPSE_TRANSITION = Object.freeze({
  type: 'spring',
  stiffness: 380,
  damping: 32,
  mass: 0.45,
});

export const NAV_PEEK_SPRING = NAV_SPRINGS.PEEK;
export const NAV_SURFACE_TRANSITION = Object.freeze({
  type: 'tween',
  duration: NAV_TIERS.SURFACE.duration,
  ease: NAV_EASINGS.CINEMATIC,
});

export const NAV_BACKDROP_TRANSITION = Object.freeze({
  type: 'tween',
  duration: NAV_TIERS.SURFACE.duration * 0.6,
  ease: NAV_EASINGS.SOFT,
});

export const NAV_FADE_TRANSITION = Object.freeze({
  type: 'tween',
  duration: NAV_TIERS.FAST.duration,
  ease: NAV_EASINGS.CINEMATIC,
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
  ease: NAV_EASINGS.CINEMATIC,
});

export const NAV_RESULTS_TRANSITION = Object.freeze({
  type: 'tween',
  duration: NAV_TIERS.STANDARD.duration,
  ease: NAV_EASINGS.CINEMATIC,
});

export const NAV_RESULTS_EXIT_TRANSITION = Object.freeze({
  type: 'tween',
  duration: NAV_TIERS.FAST.duration,
  ease: NAV_EASINGS.EXIT,
});

export const NAV_RESULTS_STAGGER_DELAY = 0.045;

export const NAV_COMPACT_TO_SURFACE_DELAY_MS = 380;
export const NAV_SURFACE_EXIT_SETTLE_MS = 520;

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

export const slideFadeVariants = buildVariants('SURFACE');
export const textCrossfadeVariants = buildVariants('STANDARD');
export const staggerItemVariants = buildVariants('FAST', { includeY: true });
