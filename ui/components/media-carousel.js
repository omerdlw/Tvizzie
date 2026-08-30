'use client';

import { Children, useCallback, useEffect, useMemo, useState } from 'react';
import { useDraggableScroll } from '@/shared';
import { cn } from '@/ui/class-names';
import { Button } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';

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

export default function Carousel({
  children,
  className = '',
  gap = 'gap-2',
  itemClassName = '',
  arrowPlacement = 'edge',
  arrowClassName = '',
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

  return (
    <div className="group/carousel relative w-full">
      <div
        ref={scrollRef}
        onDragStart={(event) => event.preventDefault()}
        onScroll={updateScrollState}
        className={cn(
          'scrollbar-hide flex cursor-grab touch-pan-y overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth select-none rounded-[20px]',
          className,
          gap,
        )}
      >
        {items.map((child, index) => (
          <div
            key={child?.key ?? `carousel-item-${index}`}
            className={cn('shrink-0 rounded-[20px]', itemClassName)}
          >
            {child}
          </div>
        ))}
      </div>
      {scrollState.canScrollLeft && (
        <Button
          key="carousel-btn-left"
          type="button"
          aria-label="Scroll left"
          onClick={() => scrollByDirection(-1)}
          className={cn(
            'center absolute top-1/2 z-10 size-9 -translate-y-1/2 cursor-pointer rounded-full ring-1 ring-inset ring-black/10 bg-white/70 text-black shadow-md transition-colors duration-150 hover:bg-white sm:size-10',
            arrowPlacement === 'inset' ? 'left-2 sm:left-3' : 'left-1 md:-left-4',
            arrowClassName,
          )}
        >
          <Icon icon="solar:alt-arrow-left-bold" className="size-4 sm:size-5" />
        </Button>
      )}

      {scrollState.canScrollRight && (
        <Button
          key="carousel-btn-right"
          type="button"
          aria-label="Scroll right"
          onClick={() => scrollByDirection(1)}
          className={cn(
            'center absolute top-1/2 z-10 size-9 -translate-y-1/2 cursor-pointer rounded-full ring-1 ring-inset ring-black/10 bg-white/70 text-black shadow-md transition-colors duration-150 hover:bg-white sm:size-10',
            arrowPlacement === 'inset' ? 'right-2 sm:right-3' : 'right-1 md:-right-4',
            arrowClassName,
          )}
        >
          <Icon icon="solar:alt-arrow-right-bold" className="size-4 sm:size-5" />
        </Button>
      )}
    </div>
  );
}
