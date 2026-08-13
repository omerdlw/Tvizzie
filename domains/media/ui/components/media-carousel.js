'use client';

import { Children, useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useDraggableScroll } from '@/shared/hooks/use-draggable-scroll';
import { cn } from '@/shared/utils';
import Icon from '@/ui/primitives/icon';
import { MEDIA_ROUTE_INTERACTIONS } from '@/app/(media)/motion';
const SCROLL_STEP = 2;
const SCROLL_THRESHOLD = 4;
const FALLBACK_CARD_WIDTH = 288;
function getScrollState(element) {
  return {
    hasOverflow: element.scrollWidth - element.clientWidth > SCROLL_THRESHOLD,
    canScrollLeft: element.scrollLeft > SCROLL_THRESHOLD,
    canScrollRight:
      element.scrollLeft + element.clientWidth < element.scrollWidth - SCROLL_THRESHOLD,
  };
}
function getItemStride(element) {
  const firstItem = element.children[0];
  const secondItem = element.children[1];
  if (!firstItem) {
    return FALLBACK_CARD_WIDTH;
  }
  if (secondItem) {
    const stride = secondItem.getBoundingClientRect().left - firstItem.getBoundingClientRect().left;
    if (stride > 0) {
      return stride;
    }
  }
  const styles = getComputedStyle(element);
  const gap = Number.parseFloat(styles.columnGap || styles.gap || '0') || 0;
  return firstItem.getBoundingClientRect().width + gap;
}
export default function Carousel({ children, className = '', gap = 'gap-2', itemClassName = '' }) {
  const scrollRef = useDraggableScroll();
  const [scrollState, setScrollState] = useState({
    hasOverflow: false,
    canScrollLeft: false,
    canScrollRight: false,
  });
  const items = useMemo(() => Children.toArray(children), [children]);
  const updateScrollState = useCallback(() => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }
    const nextState = getScrollState(element);
    setScrollState((previousState) => {
      if (
        previousState.hasOverflow === nextState.hasOverflow &&
        previousState.canScrollLeft === nextState.canScrollLeft &&
        previousState.canScrollRight === nextState.canScrollRight
      ) {
        return previousState;
      }
      return nextState;
    });
  }, [scrollRef]);
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }
    updateScrollState();
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [scrollRef, updateScrollState]);
  const scrollByDirection = useCallback(
    (direction) => {
      const element = scrollRef.current;
      if (!element) {
        return;
      }
      const itemStride = getItemStride(element);
      element.scrollBy({
        left: itemStride * SCROLL_STEP * direction,
        behavior: 'smooth',
      });
    },
    [scrollRef],
  );

  return (
    <div className="group/carousel relative w-full">
      <div
        ref={scrollRef}
        onDragStart={(event) => event.preventDefault()}
        onScroll={updateScrollState}
        className={cn(
          'scrollbar-hide flex cursor-grab touch-pan-y overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth py-1 select-none',
          className,
          gap,
        )}
      >
        {items.map((child, index) => (
          <div
            key={child?.key ?? `carousel-item-${index}`}
            className={cn('shrink-0', itemClassName)}
          >
            {child}
          </div>
        ))}
      </div>
      {scrollState.canScrollLeft && (
        <motion.button
          key="carousel-btn-left"
          type="button"
          aria-label="Scroll left"
          onClick={() => scrollByDirection(-1)}
          {...MEDIA_ROUTE_INTERACTIONS.control}
          className={cn(
            'center text-primary absolute top-1/2 left-1 z-10 size-9 -translate-y-1/2 cursor-pointer border border-white/10 bg-black/90 backdrop-blur-xs sm:size-10 md:-left-4',
          )}
        >
          <Icon icon="solar:alt-arrow-left-bold" className="size-4 sm:size-5" />
        </motion.button>
      )}

      {scrollState.canScrollRight && (
        <motion.button
          key="carousel-btn-right"
          type="button"
          aria-label="Scroll right"
          onClick={() => scrollByDirection(1)}
          {...MEDIA_ROUTE_INTERACTIONS.control}
          className={cn(
            'center text-primary absolute top-1/2 right-1 z-10 size-9 -translate-y-1/2 cursor-pointer border border-white/10 bg-black/90 backdrop-blur-xs sm:size-10 md:-right-4',
          )}
        >
          <Icon icon="solar:alt-arrow-right-bold" className="size-4 sm:size-5" />
        </motion.button>
      )}
    </div>
  );
}
