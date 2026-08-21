export const MOTION_EASINGS = Object.freeze({
  CINEMATIC: Object.freeze([0.16, 1, 0.3, 1]),
  EMPHASIZED: Object.freeze([0.22, 1, 0.36, 1]),
  SOFT: Object.freeze([0.32, 0.72, 0, 1]),
  EXIT: Object.freeze([0.35, 0, 0.2, 1]),
  SOFT_EXIT: Object.freeze([0.4, 0, 0.2, 1]),
});

export const MOTION_SPRINGS = Object.freeze({
  PRESS: Object.freeze({ type: 'spring', stiffness: 600, damping: 28, mass: 0.22 }),
  BADGE: Object.freeze({ type: 'spring', stiffness: 460, damping: 18, mass: 0.32 }),
  PANEL: Object.freeze({ type: 'spring', stiffness: 280, damping: 28, mass: 0.6 }),
  FEEDBACK: Object.freeze({ type: 'spring', stiffness: 420, damping: 28, mass: 0.45 }),
});
