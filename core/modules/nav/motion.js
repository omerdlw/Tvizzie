const NAV_CARD_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 260,
  damping: 38,
  mass: 0.85,
});


export const NAV_DEFAULT_TRANSITION = Object.freeze({
  ease: [0.22, 1, 0.36, 1],
  duration: 0.35,
  type: 'tween',
});

export const NAV_CONTAINER_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 280,
  damping: 36,
  mass: 0.8,
});

export const NAV_CARD_WIDTH_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 300,
  damping: 34,
  mass: 0.8,
});


export const NAV_MICRO_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 450,
  damping: 32,
  mass: 0.6,
});

export const NAV_ACTION_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 400,
  damping: 32,
  mass: 0.7,
});

export const NAV_BADGE_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 500,
  damping: 30,
  mass: 0.5,
});

export const NAV_CONTENT_TRANSITION = Object.freeze({
  duration: 0.25,
  ease: [0.22, 1, 0.36, 1],
});

export const NAV_CARD_OPACITY_TRANSITION = Object.freeze({
  duration: 0.28,
  ease: [0.22, 1, 0.36, 1],
});

export const NAV_CARD_BLUR_TRANSITION = Object.freeze({
  duration: 0.3,
  ease: [0.22, 1, 0.36, 1],
});

export const NAV_BACKDROP_TRANSITION = Object.freeze({
  duration: 0.35,
  ease: [0.32, 0.72, 0, 1],
});

export const NAV_SEARCH_REVEAL_TRANSITION = Object.freeze({
  duration: 0.2,
  ease: [0.22, 1, 0.36, 1],
});

export const NAV_SURFACE_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 350,
  damping: 34,
  mass: 0.8,
});

export const NAV_SURFACE_ITEM_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 400,
  damping: 32,
  mass: 0.7,
});

const NAV_MAX_STAGGER_DELAY = 0.12;
const NAV_STAGGER_STEP = 0.03;



export function getNavCardStaggerDelay(position, expanded) {
  if (!expanded) {
    return 0;
  }

  return Math.min(position * NAV_STAGGER_STEP, NAV_MAX_STAGGER_DELAY);
}

export function getNavCardSpring(position = 0) {
  return NAV_CARD_SPRING;
}




