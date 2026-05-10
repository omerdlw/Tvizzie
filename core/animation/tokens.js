export const MOTION_SCOPE = Object.freeze({
  shared: 'shared',
  route: 'route',
  module: 'module',
  feature: 'feature',
});

export const MOTION_EASE = Object.freeze({
  standard: Object.freeze([0.22, 1, 0.36, 1]),
  entrance: Object.freeze([0.16, 1, 0.3, 1]),
  exit: Object.freeze([0.4, 0, 1, 1]),
  emphasis: Object.freeze([0.32, 0.72, 0, 1]),
  linear: 'linear',
});

export const MOTION_DURATION = Object.freeze({
  instant: 0,
  quick: 0.16,
  fast: 0.22,
  base: 0.32,
  calm: 0.48,
  slow: 0.64,
  cinematic: 0.84,
});

export const MOTION_SPRING = Object.freeze({
  soft: Object.freeze({
    type: 'spring',
    stiffness: 280,
    damping: 34,
    mass: 0.9,
  }),
  standard: Object.freeze({
    type: 'spring',
    stiffness: 340,
    damping: 32,
    mass: 0.8,
  }),
  responsive: Object.freeze({
    type: 'spring',
    stiffness: 420,
    damping: 34,
    mass: 0.7,
  }),
  micro: Object.freeze({
    type: 'spring',
    stiffness: 520,
    damping: 32,
    mass: 0.55,
  }),
});

export const MOTION_OFFSET = Object.freeze({
  none: 0,
  micro: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
});

export const MOTION_SCALE = Object.freeze({
  pressed: 0.985,
  subtle: 0.98,
  hidden: 0.96,
  raised: 1.015,
  active: 1,
});

export const MOTION_STAGGER = Object.freeze({
  none: Object.freeze({
    step: 0,
    max: 0,
  }),
  tight: Object.freeze({
    step: 0.03,
    max: 0.12,
  }),
  standard: Object.freeze({
    step: 0.05,
    max: 0.24,
  }),
  spacious: Object.freeze({
    step: 0.08,
    max: 0.4,
  }),
});

export const MOTION_VIEWPORT = Object.freeze({
  once: true,
  amount: 0.28,
  margin: '0px 0px -10% 0px',
});

export const MOTION_TRANSITION = Object.freeze({
  instant: Object.freeze({
    duration: MOTION_DURATION.instant,
  }),
  quick: Object.freeze({
    type: 'tween',
    duration: MOTION_DURATION.quick,
    ease: MOTION_EASE.standard,
  }),
  standard: Object.freeze({
    type: 'tween',
    duration: MOTION_DURATION.base,
    ease: MOTION_EASE.standard,
  }),
  entrance: Object.freeze({
    type: 'tween',
    duration: MOTION_DURATION.calm,
    ease: MOTION_EASE.entrance,
  }),
  exit: Object.freeze({
    type: 'tween',
    duration: MOTION_DURATION.fast,
    ease: MOTION_EASE.exit,
  }),
  emphasis: Object.freeze({
    type: 'tween',
    duration: MOTION_DURATION.slow,
    ease: MOTION_EASE.emphasis,
  }),
  spring: MOTION_SPRING.standard,
  softSpring: MOTION_SPRING.soft,
  responsiveSpring: MOTION_SPRING.responsive,
  microSpring: MOTION_SPRING.micro,
});

export const REDUCED_MOTION_TRANSITION = MOTION_TRANSITION.instant;
