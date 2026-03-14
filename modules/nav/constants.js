'use client'

import { DURATION, EASING } from '@/lib/constants'
import { cn } from '@/lib/utils'

const DEFAULT_DIMENSIONS = {
  collapsedY: -8,
  expandedY: -78,
  cardHeight: 74,
  cardChromeHeight: 24,
  actionGap: 10,
}

export const STYLES = Object.freeze({
  animation: Object.freeze({
    collapsed: Object.freeze({
      offsetY: DEFAULT_DIMENSIONS.collapsedY,
      scale: 0.9,
    }),
    expanded: Object.freeze({
      offsetY: DEFAULT_DIMENSIONS.expandedY,
      scale: 1,
    }),
    baseCardHeight: DEFAULT_DIMENSIONS.cardHeight,
    cardChromeHeight: DEFAULT_DIMENSIONS.cardChromeHeight,
    actionGap: DEFAULT_DIMENSIONS.actionGap,
    transition: Object.freeze({
      ease: EASING.EMPHASIZED,
      duration: DURATION.BALANCED,
      type: 'tween',
    }),
  }),
  card: 'absolute inset-x-0 mx-auto h-auto w-full cursor-pointer rounded-[30px] border-2 border-white/10 bg-black/40 p-2.5 backdrop-blur-xl sm:rounded-[30px]',
})

export const getNavCardProps = (
  expanded,
  position,
  showBorder,
  cardStyle,
  cardScale
) => {
  const { offsetY: expandedOffsetY } = STYLES.animation.expanded
  const { offsetY: collapsedOffsetY, scale: collapsedScale } =
    STYLES.animation.collapsed
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
      STYLES.card,
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
      zIndex: STYLES.animation.expanded.scale - position,
      opacity: 1,
    },
    initial: { opacity: 0, scale: 0.92, y: 0 },
    exit: {
      transition: {
        duration: DURATION.FAST,
        ease: EASING.EMPHASIZED,
      },
      scale: 0.92,
      opacity: 0,
    },
    transition: {
      y: {
        ...STYLES.animation.transition,
        delay: cardDelay,
      },
      scale: {
        ...STYLES.animation.transition,
        delay: cardDelay,
      },
      opacity: {
        ...STYLES.animation.transition,
        delay: cardDelay,
      },
      zIndex: {
        delay: cardDelay,
        duration: DURATION.INSTANT,
      },
    },
  }
}
