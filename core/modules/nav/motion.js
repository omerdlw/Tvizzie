const NAV_CARD_SPRINGS = Object.freeze([
  Object.freeze({ type: 'spring', stiffness: 180, damping: 28, mass: 1 }),
  Object.freeze({ type: 'spring', stiffness: 160, damping: 26, mass: 1 }),
  Object.freeze({ type: 'spring', stiffness: 140, damping: 24, mass: 1 }),
]);

export const NAV_DEFAULT_TRANSITION = Object.freeze({
  ease: [0.16, 1, 0.3, 1],
  duration: 0.4,
  type: 'tween',
});

export const NAV_CONTAINER_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 300,
  damping: 28,
  mass: 0.8,
});

export const NAV_CARD_WIDTH_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 300,
  damping: 28,
  mass: 0.8,
});

export const NAV_MICRO_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 400,
  damping: 28,
  mass: 0.6,
});

export const NAV_ACTION_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 300,
  damping: 30,
  mass: 0.8,
});

export const NAV_BADGE_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 400,
  damping: 28,
  mass: 0.6,
});

export const NAV_CONTENT_TRANSITION = Object.freeze({
  duration: 0.25,
  ease: [0.16, 1, 0.3, 1],
});

export const NAV_CARD_OPACITY_TRANSITION = Object.freeze({
  duration: 0.28,
  ease: [0.16, 1, 0.3, 1],
});

export const NAV_CARD_BLUR_TRANSITION = Object.freeze({
  duration: 0.3,
  ease: [0.16, 1, 0.3, 1],
});

export const NAV_BACKDROP_TRANSITION = Object.freeze({
  duration: 0.45,
  ease: [0.16, 1, 0.3, 1],
});

export const NAV_SEARCH_REVEAL_TRANSITION = Object.freeze({
  duration: 0.3,
  ease: [0.16, 1, 0.3, 1],
});

export const NAV_SURFACE_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 300,
  damping: 30,
  mass: 0.8,
});

export const NAV_SURFACE_ITEM_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 300,
  damping: 30,
  mass: 0.8,
});

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
