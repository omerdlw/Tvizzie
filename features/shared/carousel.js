'use client';

import { Children, useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

import { useDraggableScroll } from '@/core/hooks';
import { cn } from '@/core/utils';
import Icon from '@/ui/icon';

const SCROLL_STEP = 2;
const SCROLL_THRESHOLD = 4;
const FALLBACK_CARD_WIDTH = 288;
const ACCENT_EASING = [0.32, 0.72, 0, 1];

function getScrollState(element) {
  return {
    hasOverflow: element.scrollWidth - element.clientWidth > SCROLL_THRESHOLD,
    canScrollLeft: element.scrollLeft > SCROLL_THRESHOLD,
    canScrollRight: element.scrollLeft + element.clientWidth < element.scrollWidth - SCROLL_THRESHOLD,
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
    [scrollRef]
  );
  const controlTransition = { duration: 0.42, ease: ACCENT_EASING };

  return (
    <div className="group/carousel relative -m-1">
      <div
        ref={scrollRef}
        onDragStart={(event) => event.preventDefault()}
        onScroll={updateScrollState}
        className={cn(
          'scrollbar-hide flex snap-x snap-mandatory cursor-grab overflow-x-auto overscroll-x-contain rounded-[14px] p-1 select-none',
          gap,
          className
        )}
      >
        {items.map((child, index) => (
          <div key={child?.key ?? `carousel-item-${index}`} className={cn('shrink-0 snap-start', itemClassName)}>
            {child}
          </div>
        ))}
      </div>
      {scrollState.canScrollLeft && (
        <motion.button
          type="button"
          aria-label="Scroll left"
          onClick={() => scrollByDirection(-1)}
          initial={{ opacity: 0, x: 10, scale: 0.88 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 6, scale: 0.92 }}
          transition={controlTransition}
          className={cn(
            'center absolute top-1/2 left-2 z-10 size-6 -translate-y-1/2 cursor-pointer rounded-[10px] bg-white text-black/70 transition duration-[200ms] hover:bg-white hover:text-black md:left-[-16px] md:size-8'
          )}
        >
          <Icon icon="solar:alt-arrow-left-bold" size={16} />
        </motion.button>
      )}

      {scrollState.canScrollRight && (
        <motion.button
          type="button"
          aria-label="Scroll right"
          onClick={() => scrollByDirection(1)}
          initial={{ opacity: 0, x: -10, scale: 0.88 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -6, scale: 0.92 }}
          transition={controlTransition}
          className={cn(
            'center absolute top-1/2 right-2 z-10 size-6 -translate-y-1/2 cursor-pointer rounded-[10px] bg-white text-black/70 transition duration-[200ms] hover:bg-white hover:text-black md:right-[-16px] md:size-8'
          )}
        >
          <Icon icon="solar:alt-arrow-right-bold" size={16} />
        </motion.button>
      )}
    </div>
  );
}
