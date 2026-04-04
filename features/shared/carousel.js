'use client';

import { Children, useCallback, useEffect, useMemo, useState } from 'react';

import { useDraggableScroll } from '@/core/hooks';
import { cn } from '@/core/utils';
import Icon from '@/ui/icon';

const SCROLL_STEP = 2;
const SCROLL_THRESHOLD = 4;
const FALLBACK_CARD_WIDTH = 288;

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

  return (
    <div className="group/carousel relative -m-1">
      <div
        ref={scrollRef}
        onDragStart={(event) => event.preventDefault()}
        onScroll={updateScrollState}
        className={cn(
          'scrollbar-hide flex cursor-grab overflow-x-auto overscroll-x-contain rounded-[14px] p-1 select-none',
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
      {scrollState.hasOverflow && (
        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => scrollByDirection(-1)}
          disabled={!scrollState.canScrollLeft}
          className={cn(
            'center absolute top-1/2 left-2 z-10 h-10 w-10 -translate-y-1/2 rounded-[14px] border border-black/10 bg-white/75 text-black/70 shadow-[0_10px_25px_-18px_rgba(15,23,42,0.65)] backdrop-blur-md transition duration-(--motion-duration-fast) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7]/45 md:left-[-16px] md:h-9 md:w-9',
            scrollState.canScrollLeft
              ? 'cursor-pointer hover:border-black/20 hover:bg-white hover:text-black'
              : 'cursor-default opacity-35'
          )}
        >
          <Icon icon="solar:alt-arrow-left-bold" size={16} />
        </button>
      )}

      {scrollState.hasOverflow && (
        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => scrollByDirection(1)}
          disabled={!scrollState.canScrollRight}
          className={cn(
            'center absolute top-1/2 right-2 z-10 h-10 w-10 -translate-y-1/2 rounded-[14px] border border-black/10 bg-white/75 text-black/70 shadow-[0_10px_25px_-18px_rgba(15,23,42,0.65)] backdrop-blur-md transition duration-(--motion-duration-fast) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7]/45 md:right-[-16px] md:h-9 md:w-9',
            scrollState.canScrollRight
              ? 'cursor-pointer hover:border-black/20 hover:bg-white hover:text-black'
              : 'cursor-default opacity-35'
          )}
        >
          <Icon icon="solar:alt-arrow-right-bold" size={16} />
        </button>
      )}
    </div>
  );
}
