'use client'

import { DURATION } from '@/lib/constants'
import { cn } from '@/lib/utils'

const DEFAULT_DIMENSIONS = {
  collapsedY: -8,
  expandedY: -78,
  cardHeight: 74,
  actionGap: 10,
}

export const ANIMATION = {
  collapsed: { offsetY: DEFAULT_DIMENSIONS.collapsedY, scale: 0.9 },
  expanded: { offsetY: DEFAULT_DIMENSIONS.expandedY, scale: 1 },
  BASE_CARD_HEIGHT: DEFAULT_DIMENSIONS.cardHeight,
  ACTION_GAP: DEFAULT_DIMENSIONS.actionGap,
  transition: {
    ease: [0.23, 1, 0.32, 1],
    duration: 0.45,
    type: 'tween',
  },
}

export const getNavCardProps = (
  expanded,
  position,
  showBorder,
  cardStyle,
  cardScale
) => {
  const { offsetY: expandedOffsetY } = ANIMATION.expanded
  const { offsetY: collapsedOffsetY, scale: collapsedScale } =
    ANIMATION.collapsed
  const safeCardStyle = cardStyle
    ? Object.fromEntries(
        Object.entries(cardStyle).filter(
          ([key]) => key !== 'scale' && key !== 'className'
        )
      )
    : {}

  const cardDelay = expanded ? position * 0.02 : 0

  return {
    className: cn(
      'absolute inset-x-0 mx-auto h-auto w-full cursor-pointer rounded-[30px] border-2 border-white/10 bg-black/40 p-2.5 backdrop-blur-xl sm:rounded-[30px]',
      showBorder && 'border-white/15',
      cardStyle?.className
    ),
    style: {
      ...safeCardStyle,
      willChange: expanded || position === 0 ? 'transform' : 'auto',
    },
    animate: {
      y: expanded ? position * expandedOffsetY : position * collapsedOffsetY,
      scale: expanded ? cardScale || 1 : collapsedScale ** position,
      zIndex: ANIMATION.expanded.scale - position,
      opacity: 1,
    },
    initial: { opacity: 0, scale: 0.92, y: 0 },
    exit: {
      transition: {
        duration: DURATION.FAST,
        ease: [0.23, 1, 0.32, 1],
      },
      scale: 0.92,
      opacity: 0,
    },
    transition: {
      y: {
        ...ANIMATION.transition,
        delay: cardDelay,
      },
      scale: {
        ...ANIMATION.transition,
        delay: cardDelay,
      },
      opacity: {
        ...ANIMATION.transition,
        delay: cardDelay,
      },
      zIndex: {
        delay: cardDelay,
        duration: 0,
      },
    },
  }
}
