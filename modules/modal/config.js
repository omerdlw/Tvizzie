import { DURATION } from '@/lib/constants'

export const MODAL_POSITIONS = {
  CENTER: 'center',
  BOTTOM: 'bottom',
  RIGHT: 'right',
  LEFT: 'left',
  TOP: 'top',
  TOP_LEFT: 'top-left',
  TOP_RIGHT: 'top-right',
  BOTTOM_LEFT: 'bottom-left',
  BOTTOM_RIGHT: 'bottom-right',
}

export const ANIMATION_CONFIGS = {
  SPRING: {
    stiffness: 260,
    type: 'spring',
    damping: 20,
  },
  SMOOTH: {
    type: 'tween',
    ease: [0.32, 0.72, 0, 1],
    duration: DURATION.SLOW,
  },
}
