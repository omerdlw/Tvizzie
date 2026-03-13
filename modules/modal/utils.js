import { DURATION } from '@/lib/constants'

import { ANIMATION_CONFIGS, MODAL_POSITIONS } from './config'

const BASE_EXIT_TRANSITION = { duration: DURATION.NORMAL, ease: 'easeIn' }
const SPRING_TRANSITION = ANIMATION_CONFIGS.SPRING
const SMOOTH_TRANSITION = ANIMATION_CONFIGS.SMOOTH

export const getModalVariants = (position) => {
  const variants = {
    [MODAL_POSITIONS.CENTER]: {
      hidden: { scale: 0.9, opacity: 0 },
      visible: {
        scale: 1,
        opacity: 1,
        transition: SPRING_TRANSITION,
      },
      exit: {
        scale: 0.9,
        opacity: 0,
        transition: BASE_EXIT_TRANSITION,
      },
    },
    [MODAL_POSITIONS.TOP]: {
      hidden: { y: '-100%', opacity: 0 },
      visible: {
        y: 0,
        opacity: 1,
        transition: SMOOTH_TRANSITION,
      },
      exit: {
        y: '-100%',
        opacity: 0,
        transition: BASE_EXIT_TRANSITION,
      },
    },
    [MODAL_POSITIONS.BOTTOM]: {
      hidden: { y: '100%', opacity: 0 },
      visible: {
        y: 0,
        opacity: 1,
        transition: SMOOTH_TRANSITION,
      },
      exit: {
        y: '100%',
        opacity: 0,
        transition: BASE_EXIT_TRANSITION,
      },
    },
    [MODAL_POSITIONS.LEFT]: {
      hidden: { x: '-100%', opacity: 0 },
      visible: {
        x: 0,
        opacity: 1,
        transition: SMOOTH_TRANSITION,
      },
      exit: {
        x: '-100%',
        opacity: 0,
        transition: BASE_EXIT_TRANSITION,
      },
    },
    [MODAL_POSITIONS.RIGHT]: {
      hidden: { x: '100%', opacity: 0 },
      visible: {
        x: 0,
        opacity: 1,
        transition: SMOOTH_TRANSITION,
      },
      exit: {
        x: '100%',
        opacity: 0,
        transition: BASE_EXIT_TRANSITION,
      },
    },
  }

  return variants[position] || variants[MODAL_POSITIONS.CENTER]
}

export const POSITION_CLASSES = {
  [MODAL_POSITIONS.CENTER]: 'items-center justify-center',
  [MODAL_POSITIONS.TOP]: 'items-center justify-start',
  [MODAL_POSITIONS.BOTTOM]: 'items-center justify-end',
  [MODAL_POSITIONS.LEFT]: 'items-start justify-start',
  [MODAL_POSITIONS.RIGHT]: 'items-end justify-start',
}

export const BACKDROP_VARIANTS = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.FAST } },
}
