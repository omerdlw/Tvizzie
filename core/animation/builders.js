import {
  MOTION_OFFSET,
  MOTION_SCALE,
  MOTION_STAGGER,
  MOTION_TRANSITION,
  MOTION_VIEWPORT,
} from './tokens';
import { freezeMotion, mergeMotionConfig, withStaggerDelay } from './utils';

function resolveAxisOffset(axis, amount) {
  if (axis === 'x') {
    return { x: amount };
  }

  return { y: amount };
}

export function createFadeMotion({ transition = MOTION_TRANSITION.standard, exitTransition = MOTION_TRANSITION.exit } = {}) {
  return freezeMotion({
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: {
      opacity: 0,
      transition: exitTransition,
    },
    transition,
  });
}

export function createSlideMotion({
  axis = 'y',
  distance = MOTION_OFFSET.md,
  direction = 1,
  transition = MOTION_TRANSITION.entrance,
  exitTransition = MOTION_TRANSITION.exit,
} = {}) {
  const offset = resolveAxisOffset(axis, distance * direction);

  return freezeMotion({
    initial: {
      opacity: 0,
      ...offset,
    },
    animate: {
      opacity: 1,
      x: 0,
      y: 0,
    },
    exit: {
      opacity: 0,
      ...offset,
      transition: exitTransition,
    },
    transition,
  });
}

export function createScaleMotion({
  initialScale = MOTION_SCALE.hidden,
  activeScale = MOTION_SCALE.active,
  exitScale = MOTION_SCALE.subtle,
  transition = MOTION_TRANSITION.responsiveSpring,
  exitTransition = MOTION_TRANSITION.exit,
} = {}) {
  return freezeMotion({
    initial: {
      opacity: 0,
      scale: initialScale,
    },
    animate: {
      opacity: 1,
      scale: activeScale,
    },
    exit: {
      opacity: 0,
      scale: exitScale,
      transition: exitTransition,
    },
    transition,
  });
}

export function createSurfaceMotion(options = {}) {
  return createSlideMotion({
    distance: MOTION_OFFSET.sm,
    transition: MOTION_TRANSITION.softSpring,
    ...options,
  });
}

export function createContentMotion(options = {}) {
  return createSlideMotion({
    distance: MOTION_OFFSET.md,
    transition: MOTION_TRANSITION.entrance,
    ...options,
  });
}

export function createListContainerMotion({
  transition = MOTION_TRANSITION.standard,
  stagger = MOTION_STAGGER.standard,
} = {}) {
  return freezeMotion({
    initial: 'hidden',
    animate: 'visible',
    exit: 'exit',
    variants: {
      hidden: {},
      visible: {
        transition: {
          ...transition,
          staggerChildren: stagger.step,
          delayChildren: 0,
        },
      },
      exit: {
        transition: {
          ...MOTION_TRANSITION.exit,
          staggerChildren: stagger.step,
          staggerDirection: -1,
        },
      },
    },
  });
}

export function createListItemMotion({
  index = 0,
  stagger = MOTION_STAGGER.standard,
  transition = MOTION_TRANSITION.entrance,
  exitTransition = MOTION_TRANSITION.exit,
  axis = 'y',
  distance = MOTION_OFFSET.sm,
} = {}) {
  return mergeMotionConfig(createSlideMotion({ axis, distance, transition, exitTransition }), {
    transition: withStaggerDelay(transition, index, stagger),
  });
}

export function createInteractionMotion({
  rest = {},
  hover = { y: -MOTION_OFFSET.micro },
  tap = { scale: MOTION_SCALE.pressed },
  transition = MOTION_TRANSITION.microSpring,
} = {}) {
  return freezeMotion({
    initial: rest,
    animate: rest,
    whileHover: hover,
    whileTap: tap,
    transition,
  });
}

export function createViewportMotion({ viewport = MOTION_VIEWPORT, motion = createContentMotion() } = {}) {
  return mergeMotionConfig(motion, {
    initial: motion.initial || 'hidden',
    whileInView: motion.animate || 'visible',
    viewport,
  });
}

export function createReducedMotion(motion = {}) {
  return mergeMotionConfig(motion, {
    initial: false,
    animate: motion.animate || {},
    exit: motion.exit ? { opacity: 0 } : undefined,
    transition: MOTION_TRANSITION.instant,
  });
}
