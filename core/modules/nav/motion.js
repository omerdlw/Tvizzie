const NAV_CARD_SPRINGS = Object.freeze([
  Object.freeze({ type: 'spring', stiffness: 210, damping: 32, mass: 0.98 }),
  Object.freeze({ type: 'spring', stiffness: 190, damping: 31, mass: 1 }),
  Object.freeze({ type: 'spring', stiffness: 170, damping: 30, mass: 1.02 }),
]);

export const NAV_DEFAULT_TRANSITION = Object.freeze({
  ease: [0.16, 1, 0.3, 1],
  duration: 0.34,
  type: 'tween',
});

export const NAV_CONTAINER_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 210,
  damping: 34,
  mass: 1,
});

export const NAV_CARD_WIDTH_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 220,
  damping: 34,
  mass: 0.95,
});

export const NAV_MICRO_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 400,
  damping: 28,
  mass: 0.6,
});

export const NAV_ACTION_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 260,
  damping: 32,
  mass: 0.86,
});

export const NAV_BADGE_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 400,
  damping: 28,
  mass: 0.6,
});

export const NAV_CONTENT_TRANSITION = Object.freeze({
  duration: 0.22,
  ease: [0.16, 1, 0.3, 1],
});

export const NAV_CARD_OPACITY_TRANSITION = Object.freeze({
  duration: 0.24,
  ease: [0.16, 1, 0.3, 1],
});

export const NAV_CARD_BLUR_TRANSITION = Object.freeze({
  duration: 0.28,
  ease: [0.16, 1, 0.3, 1],
});

export const NAV_BACKDROP_TRANSITION = Object.freeze({
  duration: 0.34,
  ease: [0.16, 1, 0.3, 1],
});

export const NAV_SEARCH_REVEAL_TRANSITION = Object.freeze({
  duration: 0.24,
  ease: [0.16, 1, 0.3, 1],
});

export const NAV_SURFACE_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 280,
  damping: 30,
  mass: 0.84,
});

export const NAV_SURFACE_ITEM_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 290,
  damping: 30,
  mass: 0.82,
});

export const NAV_COMPACT_SURFACE_OPEN_DELAY_MS = 180;
export const NAV_SURFACE_COMPACT_RESTORE_DELAY_MS = 150;

const NAV_MAX_STAGGER_DELAY = 0.08;
const NAV_STAGGER_STEP = 0.02;

export function getNavCardStaggerDelay(position, expanded) {
  if (!expanded) {
    return 0;
  }

  return Math.min(position * NAV_STAGGER_STEP, NAV_MAX_STAGGER_DELAY);
}

export function getNavCardSpring(position = 0) {
  return NAV_CARD_SPRINGS[position] || NAV_CARD_SPRINGS[NAV_CARD_SPRINGS.length - 1];
}
