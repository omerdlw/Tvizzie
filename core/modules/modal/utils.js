import { MODAL_POSITIONS } from './config';

const MODAL_SPRING_ENTER = Object.freeze({
  type: 'spring',
  stiffness: 280,
  damping: 32,
  mass: 1.1,
});

const MODAL_SPRING_EXIT = Object.freeze({
  type: 'spring',
  stiffness: 320,
  damping: 38,
  mass: 1,
});

const PANEL_OPACITY_ENTER_TRANSITION = Object.freeze({
  duration: 0.4,
  ease: [0.19, 1, 0.22, 1],
});

const PANEL_OPACITY_EXIT_TRANSITION = Object.freeze({
  duration: 0.3,
  ease: [0.19, 1, 0.22, 1],
});

const BACKDROP_TRANSITION = Object.freeze({
  duration: 0.6,
  ease: [0.19, 1, 0.22, 1],
});

const BACKDROP_EXIT_TRANSITION = Object.freeze({
  duration: 0.4,
  ease: [0.19, 1, 0.22, 1],
});

function createCenterVariant() {
  return {
    hidden: { scale: 0.96, y: 16, opacity: 0 },
    visible: {
      scale: 1,
      y: 0,
      opacity: 1,
      transition: {
        opacity: PANEL_OPACITY_ENTER_TRANSITION,
        scale: MODAL_SPRING_ENTER,
        y: MODAL_SPRING_ENTER,
      },
    },
    exit: {
      scale: 0.98,
      y: 12,
      opacity: 0,
      transition: {
        opacity: PANEL_OPACITY_EXIT_TRANSITION,
        scale: MODAL_SPRING_EXIT,
        y: MODAL_SPRING_EXIT,
      },
    },
  };
}

function createDirectionalVariant(axis, hiddenValue) {
  const isHorizontal = axis === 'x';
  const exitValue = typeof hiddenValue === 'string' ? hiddenValue : hiddenValue * 0.8;

  return {
    hidden: { [axis]: hiddenValue, opacity: 0 },
    visible: {
      [axis]: 0,
      opacity: 1,
      transition: {
        opacity: PANEL_OPACITY_ENTER_TRANSITION,
        [axis]: MODAL_SPRING_ENTER,
      },
    },
    exit: {
      [axis]: exitValue,
      opacity: 0,
      transition: {
        opacity: PANEL_OPACITY_EXIT_TRANSITION,
        [axis]: MODAL_SPRING_EXIT,
      },
    },
  };
}

const POSITION_VARIANT_BUILDERS = Object.freeze({
  [MODAL_POSITIONS.CENTER]: () => createCenterVariant(),
  [MODAL_POSITIONS.TOP]: () => createDirectionalVariant('y', '-100%'),
  [MODAL_POSITIONS.BOTTOM]: () => createDirectionalVariant('y', '100%'),
  [MODAL_POSITIONS.LEFT]: () => createDirectionalVariant('x', '-100%'),
  [MODAL_POSITIONS.RIGHT]: () => createDirectionalVariant('x', '100%'),
});

export function getModalVariants(position) {
  const buildVariants = POSITION_VARIANT_BUILDERS[position] || POSITION_VARIANT_BUILDERS[MODAL_POSITIONS.CENTER];
  return buildVariants();
}

export const POSITION_CLASSES = Object.freeze({
  [MODAL_POSITIONS.CENTER]: 'items-center justify-center',
  [MODAL_POSITIONS.TOP]: 'items-center justify-start',
  [MODAL_POSITIONS.BOTTOM]: 'items-center justify-end',
  [MODAL_POSITIONS.LEFT]: 'items-start justify-start',
  [MODAL_POSITIONS.RIGHT]: 'items-end justify-start',
});

export function getBackdropVariants() {
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

