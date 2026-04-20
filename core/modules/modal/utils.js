import { MODAL_POSITIONS } from './config';

const REDUCED_TRANSITION = Object.freeze({
  duration: 0.00001,
  ease: 'linear',
});

const PANEL_OPACITY_ENTER_TRANSITION = Object.freeze({
  duration: 0.28,
  ease: [0, 0, 0.2, 1],
});

const PANEL_OPACITY_EXIT_TRANSITION = Object.freeze({
  duration: 0.22,
  ease: [0.4, 0, 0.2, 1],
});

const CENTER_PANEL_ENTER_TRANSITION = Object.freeze({
  type: 'tween',
  duration: 0.5,
  ease: [0.25, 0.46, 0.45, 0.94],
});

const CENTER_PANEL_EXIT_TRANSITION = Object.freeze({
  type: 'tween',
  duration: 0.2,
  ease: [0.25, 0.46, 0.45, 0.94],
});

const EDGE_PANEL_ENTER_TRANSITION = Object.freeze({
  type: 'tween',
  duration: 0.5,
  ease: [0.25, 0.46, 0.45, 0.94],
});

const EDGE_PANEL_EXIT_TRANSITION = Object.freeze({
  type: 'tween',
  duration: 0.45,
  ease: [0.25, 0.46, 0.45, 0.94],
});

const BACKDROP_TRANSITION = Object.freeze({
  duration: 0.45,
  ease: [0.25, 0.46, 0.45, 0.94],
});

const BACKDROP_EXIT_TRANSITION = Object.freeze({
  duration: 0.3,
  ease: [0.25, 0.46, 0.45, 0.94],
});

function createCenterVariant(reduceMotion) {
  if (reduceMotion) {
    return {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: REDUCED_TRANSITION,
      },
      exit: {
        opacity: 0,
        transition: REDUCED_TRANSITION,
      },
    };
  }

  return {
    hidden: { scale: 0.986, y: 12, opacity: 0 },
    visible: {
      scale: 1,
      y: 0,
      opacity: 1,
      transition: {
        opacity: PANEL_OPACITY_ENTER_TRANSITION,
        scale: CENTER_PANEL_ENTER_TRANSITION,
        y: CENTER_PANEL_ENTER_TRANSITION,
      },
    },
    exit: {
      scale: 0.992,
      y: 8,
      opacity: 0,
      transition: {
        opacity: PANEL_OPACITY_EXIT_TRANSITION,
        scale: CENTER_PANEL_EXIT_TRANSITION,
        y: CENTER_PANEL_EXIT_TRANSITION,
      },
    },
  };
}

function createDirectionalVariant(axis, hiddenValue, reduceMotion) {
  if (reduceMotion) {
    return {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: REDUCED_TRANSITION,
      },
      exit: {
        opacity: 0,
        transition: REDUCED_TRANSITION,
      },
    };
  }

  return {
    hidden: { [axis]: hiddenValue, opacity: 0 },
    visible: {
      [axis]: 0,
      opacity: 1,
      transition: {
        opacity: PANEL_OPACITY_ENTER_TRANSITION,
        [axis]: EDGE_PANEL_ENTER_TRANSITION,
      },
    },
    exit: {
      [axis]: hiddenValue,
      opacity: 0,
      transition: {
        opacity: PANEL_OPACITY_EXIT_TRANSITION,
        [axis]: EDGE_PANEL_EXIT_TRANSITION,
      },
    },
  };
}

const POSITION_VARIANT_BUILDERS = Object.freeze({
  [MODAL_POSITIONS.CENTER]: (reduceMotion) => createCenterVariant(reduceMotion),
  [MODAL_POSITIONS.TOP]: (reduceMotion) => createDirectionalVariant('y', '-100%', reduceMotion),
  [MODAL_POSITIONS.BOTTOM]: (reduceMotion) => createDirectionalVariant('y', '100%', reduceMotion),
  [MODAL_POSITIONS.LEFT]: (reduceMotion) => createDirectionalVariant('x', '-100%', reduceMotion),
  [MODAL_POSITIONS.RIGHT]: (reduceMotion) => createDirectionalVariant('x', '100%', reduceMotion),
});

export function getModalVariants(position, reduceMotion = false) {
  const buildVariants = POSITION_VARIANT_BUILDERS[position] || POSITION_VARIANT_BUILDERS[MODAL_POSITIONS.CENTER];
  return buildVariants(reduceMotion);
}

export const POSITION_CLASSES = Object.freeze({
  [MODAL_POSITIONS.CENTER]: 'items-center justify-center',
  [MODAL_POSITIONS.TOP]: 'items-center justify-start',
  [MODAL_POSITIONS.BOTTOM]: 'items-center justify-end',
  [MODAL_POSITIONS.LEFT]: 'items-start justify-start',
  [MODAL_POSITIONS.RIGHT]: 'items-end justify-start',
});

export function getBackdropVariants(reduceMotion = false) {
  if (reduceMotion) {
    return {
      hidden: {
        opacity: 0,
        transition: REDUCED_TRANSITION,
      },
      visible: {
        opacity: 1,
        transition: REDUCED_TRANSITION,
      },
    };
  }

  return {
    hidden: {
      opacity: 0,
      transition: BACKDROP_EXIT_TRANSITION,
    },
    visible: {
      opacity: 1,
      transition: BACKDROP_TRANSITION,
    },
  };
}
