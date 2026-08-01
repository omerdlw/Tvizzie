'use client';

import { Children, useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDraggableScroll } from '@/shared/hooks/use-draggable-scroll';
import { cn } from '@/shared/lib';
import Icon from '@/ui/primitives/icon';
const SCROLL_STEP = 2;
const SCROLL_THRESHOLD = 4;
const FALLBACK_CARD_WIDTH = 288;
const ACCENT_EASING = [0.32, 0.72, 0, 1];
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
export default function Carousel({
  children,
  className = '',
  gap = 'gap-2',
  itemClassName = '',
  buttonProps,
}) {
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

  const resolveButtonProps = useCallback(
    (direction) => {
      if (typeof buttonProps === 'function') {
        return buttonProps(direction);
      }
      if (buttonProps && typeof buttonProps === 'object') {
        return buttonProps;
      }
      return {
        initial: { opacity: 0, scale: 0.8, filter: 'blur(8px)' },
        animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
        exit: { opacity: 0, scale: 0.8, filter: 'blur(8px)' },
        transition: { duration: 0.42, ease: ACCENT_EASING },
        whileHover: { scale: 1.1 },
        whileTap: { scale: 0.9 },
      };
    },
    [buttonProps],
  );

  return (
    <div className="group/carousel relative">
      <div
        ref={scrollRef}
        onDragStart={(event) => event.preventDefault()}
        onScroll={updateScrollState}
        className={cn(
          'scrollbar-hide rounded-[20px] flex cursor-grab touch-pan-y overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth select-none',
          gap,
          className,
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
      <AnimatePresence>
        {scrollState.canScrollLeft && (
          <motion.button
            key="carousel-btn-left"
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollByDirection(-1)}
            {...resolveButtonProps(-1)}
            className={cn(
              'center absolute top-1/2 left-2 z-10 size-6 -translate-y-1/2 cursor-pointer rounded-full bg-black text-primary md:left-[-16px] md:size-8',
            )}
          >
            <Icon icon="solar:alt-arrow-left-bold" size={16} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {scrollState.canScrollRight && (
          <motion.button
            key="carousel-btn-right"
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollByDirection(1)}
            {...resolveButtonProps(1)}
            className={cn(
              'center absolute top-1/2 right-2 z-10 size-6 -translate-y-1/2 cursor-pointer rounded-full bg-black text-primary md:right-[-16px] md:size-8',
            )}
          >
            <Icon icon="solar:alt-arrow-right-bold" size={16} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
