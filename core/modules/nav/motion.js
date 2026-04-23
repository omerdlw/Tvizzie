const NAV_CARD_SPRINGS = Object.freeze([
  Object.freeze({ type: 'spring', stiffness: 300, damping: 31, mass: 0.92 }),
  Object.freeze({ type: 'spring', stiffness: 264, damping: 29, mass: 0.98 }),
  Object.freeze({ type: 'spring', stiffness: 232, damping: 27, mass: 1.04 }),
]);

export const NAV_DEFAULT_TRANSITION = Object.freeze({
  ease: [0.25, 0.46, 0.45, 0.94],
  duration: 0.5,
  type: 'tween',
});

export const NAV_CONTAINER_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 300,
  damping: 32,
  mass: 0.96,
});

export const NAV_CARD_WIDTH_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 248,
  damping: 29,
  mass: 1,
});

export const NAV_MICRO_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 360,
  damping: 28,
  mass: 0.72,
});

export const NAV_ACTION_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 340,
  damping: 27,
  mass: 0.76,
});

export const NAV_BADGE_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 420,
  damping: 30,
  mass: 0.62,
});

export const NAV_CONTENT_TRANSITION = Object.freeze({
  duration: 0.2,
  ease: [0.25, 0.46, 0.45, 0.94],
});

export const NAV_CARD_OPACITY_TRANSITION = Object.freeze({
  duration: 0.22,
  ease: [0.25, 0.46, 0.45, 0.94],
});

export const NAV_CARD_BLUR_TRANSITION = Object.freeze({
  duration: 0.24,
  ease: [0.25, 0.46, 0.45, 0.94],
});

export const NAV_BACKDROP_TRANSITION = Object.freeze({
  duration: 0.5,
  ease: [0.25, 0.46, 0.45, 0.94],
});

export const NAV_SEARCH_REVEAL_TRANSITION = Object.freeze({
  duration: 0.2,
  ease: [0.25, 0.46, 0.45, 0.94],
});

export const NAV_SURFACE_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 260,
  damping: 28,
  mass: 0.92,
});

export const NAV_SURFACE_ITEM_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 320,
  damping: 28,
  mass: 0.78,
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
