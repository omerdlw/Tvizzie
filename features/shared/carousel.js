'use client'

import { Children, useCallback, useEffect, useMemo, useState } from 'react'

import { useDraggableScroll } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import Icon from '@/ui/icon'

const SCROLL_STEP = 2
const SCROLL_THRESHOLD = 4
const FALLBACK_CARD_WIDTH = 288

function getScrollState(element) {
  return {
    canScrollLeft: element.scrollLeft > SCROLL_THRESHOLD,
    canScrollRight:
      element.scrollLeft + element.clientWidth <
      element.scrollWidth - SCROLL_THRESHOLD,
  }
}

function getItemStride(element) {
  const firstItem = element.children[0]
  const secondItem = element.children[1]

  if (!firstItem) {
    return FALLBACK_CARD_WIDTH
  }

  if (secondItem) {
    const stride =
      secondItem.getBoundingClientRect().left -
      firstItem.getBoundingClientRect().left

    if (stride > 0) {
      return stride
    }
  }

  const styles = getComputedStyle(element)
  const gap = Number.parseFloat(styles.columnGap || styles.gap || '0') || 0

  return firstItem.getBoundingClientRect().width + gap
}

export default function Carousel({
  children,
  className = '',
  gap = 'gap-2',
  itemClassName = '',
}) {
  const scrollRef = useDraggableScroll()

  const [scrollState, setScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: false,
  })
  const items = useMemo(() => Children.toArray(children), [children])

  const updateScrollState = useCallback(() => {
    const element = scrollRef.current
    if (!element) {
      return
    }

    const nextState = getScrollState(element)

    setScrollState((previousState) => {
      if (
        previousState.canScrollLeft === nextState.canScrollLeft &&
        previousState.canScrollRight === nextState.canScrollRight
      ) {
        return previousState
      }

      return nextState
    })
  }, [scrollRef])

  useEffect(() => {
    const element = scrollRef.current
    if (!element) {
      return
    }

    updateScrollState()

    const observer = new ResizeObserver(updateScrollState)
    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [scrollRef, updateScrollState])

  const scrollByDirection = useCallback((direction) => {
    const element = scrollRef.current
    if (!element) {
      return
    }

    const itemStride = getItemStride(element)

    element.scrollBy({
      left: itemStride * SCROLL_STEP * direction,
      behavior: 'smooth',
    })
  }, [scrollRef])

  return (
    <div className="group/carousel relative -m-1">
      <div
        ref={scrollRef}
        onDragStart={(event) => event.preventDefault()}
        onScroll={updateScrollState}
        className={cn(
          'scrollbar-hide rounded-[14px] flex overflow-x-auto overscroll-x-contain p-1 cursor-grab select-none',
          gap,
          className
        )}
      >
        {items.map((child, index) => (
          <div
            key={child?.key ?? `carousel-item-${index}`}
            className={cn('snap-start shrink-0', itemClassName)}
          >
            {child}
          </div>
        ))}
      </div>
      {scrollState.canScrollLeft && (
        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => scrollByDirection(-1)}
          className="absolute top-1/2 right-2 rounded-[12px] z-10 center h-8 w-8 -translate-y-1/2 cursor-pointer border border-white/10 backdrop-blur-sm bg-black/70 text-white transition duration-(--motion-duration-fast) hover:border-white/15 md:left-[-16px]"
        >
          <Icon icon="solar:alt-arrow-left-bold" size={16} />
        </button>
      )}

      {scrollState.canScrollRight && (
        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => scrollByDirection(1)}
          className="absolute top-1/2 right-2 rounded-[12px] z-10 center h-8 w-8 -translate-y-1/2 cursor-pointer border border-white/10 backdrop-blur-sm bg-black/70 text-white transition duration-(--motion-duration-fast) hover:border-white/15 md:right-[-16px]"
        >
          <Icon icon="solar:alt-arrow-right-bold" size={16} />
        </button>
      )}
    </div>
  )
}
