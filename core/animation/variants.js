import { ANIMATION_DURATIONS, ANIMATION_EASINGS, ANIMATION_STAGGER } from './tokens';

function clampAnimationValue(value, min = 0, max = ANIMATION_STAGGER.MAX_DELAY) {
  return Math.max(min, Math.min(max, value));
}

function resolveStaggerDelay({
  index = 0,
  groupIndex = 0,
  itemStep = ANIMATION_STAGGER.CASCADE,
  groupStep = ANIMATION_STAGGER.GROUP,
}) {
  return clampAnimationValue(groupIndex * groupStep + index * itemStep);
}

export function resolvePhaseDelay({ delay = 0, lead = 0 }) {
  return clampAnimationValue(lead + delay);
}

function buildRevealTransition({
  delay = 0,
  duration = ANIMATION_DURATIONS.SECTION,
  ease = ANIMATION_EASINGS.EXPO_OUT,
  opacityDurationFactor = 0.65,
  opacityEase = ANIMATION_EASINGS.EASE_OUT,
}) {
  return {
    opacity: {
      duration: duration * opacityDurationFactor,
      delay,
      ease: opacityEase,
    },
    scale: {
      duration,
      delay,
      ease,
    },
    x: {
      duration,
      delay,
      ease,
    },
    y: {
      duration,
      delay,
      ease,
    },
  };
}

export function buildRevealMotion({
  axis = 'y',
  delay = 0,
  direction = 1,
  distance = 24,
  duration = ANIMATION_DURATIONS.SECTION,
  ease = ANIMATION_EASINGS.EXPO_OUT,
  opacityDurationFactor = 0.65,
  opacityEase = ANIMATION_EASINGS.EASE_OUT,
  offset = null,
  scale = 0.985,
}) {
  const resolvedOffset = offset ? { ...(offset || {}) } : { [axis]: direction * distance };
  const resetOffset = Object.fromEntries(Object.keys(resolvedOffset).map((key) => [key, 0]));
  return {
    initial: { opacity: 0, scale, ...resolvedOffset },
    animate: {
      opacity: 1,
      scale: 1,
      ...resetOffset,
      transitionEnd: {
        willChange: 'auto',
      },
    },
    transition: buildRevealTransition({
      delay,
      duration,
      ease,
      opacityDurationFactor,
      opacityEase,
    }),
    style: undefined,
  };
}

export function buildClipRevealMotion({
  delay = 0,
  direction = 'up',
  duration = ANIMATION_DURATIONS.CLIP,
  ease = ANIMATION_EASINGS.EXPO_OUT,
}) {
  const clipInitial = {
    up: 'inset(100% 0% 0% 0%)',
    down: 'inset(0% 0% 100% 0%)',
    left: 'inset(0% 100% 0% 0%)',
    right: 'inset(0% 0% 0% 100%)',
  };

  return {
    initial: { clipPath: clipInitial[direction] ?? clipInitial.up, opacity: 1 },
    animate: {
      clipPath: 'inset(0% 0% 0% 0%)',
      opacity: 1,
      transitionEnd: {
        willChange: 'auto',
      },
    },
    transition: {
      clipPath: {
        duration,
        delay: clampAnimationValue(delay),
        ease,
      },
      opacity: {
        duration: 0,
        delay: 0,
      },
    },
    style: { willChange: 'clip-path', overflow: 'hidden' },
  };
}

export function createSurfaceItemMotion({
  axis = 'y',
  delayStep = ANIMATION_STAGGER.CASCADE,
  distance = 28,
  duration = ANIMATION_DURATIONS.ITEM,
  enabled = true,
  ease = ANIMATION_EASINGS.EXPO_OUT,
  groupDelayStep = ANIMATION_STAGGER.GROUP,
  groupIndex = 0,
  index = 0,
  opacityDurationFactor = 0.65,
  opacityEase = ANIMATION_EASINGS.EASE_OUT,
  scale = 0.982,
}) {
  const delay = resolveStaggerDelay({
    index,
    groupIndex,
    itemStep: delayStep,
    groupStep: groupDelayStep,
  });
  const initial = { opacity: 0, scale, [axis]: distance };

  return {
    initial: enabled ? initial : false,
    animate: {
      opacity: 1,
      scale: 1,
      [axis]: 0,
    },
    transition: buildRevealTransition({
      delay,
      duration,
      ease,
      opacityDurationFactor,
      opacityEase,
    }),
  };
}

export function createPanelMotion({
  duration = ANIMATION_DURATIONS.PANEL,
  ease = ANIMATION_EASINGS.EXPO_OUT,
  exitDuration = ANIMATION_DURATIONS.PANEL * 0.55,
  exitEase = ANIMATION_EASINGS.EXPO_IN_OUT,
  opacityDurationFactor = null,
  opacityEase = ANIMATION_EASINGS.EASE_OUT,
  y = 24,
  exitY = -14,
  initialScale = 0.984,
  exitScale = 0.99,
}) {
  const transition =
    opacityDurationFactor == null
      ? {
          duration,
          ease,
        }
      : buildRevealTransition({
          duration,
          ease,
          opacityDurationFactor,
          opacityEase,
        });

  return {
    initial: {
      opacity: 0,
      y,
      scale: initialScale,
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transitionEnd: {
        willChange: 'auto',
      },
    },
    exit: {
      opacity: 0,
      y: exitY,
      scale: exitScale,
      transition: {
        duration: exitDuration,
        ease: exitEase,
      },
    },
    transition,
  };
}
