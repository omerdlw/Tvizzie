'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useDraggableScroll } from '@/core/hooks/use-draggable-scroll';
import { cn } from '@/core/utils';
function defaultGetKey(item) {
  return item?.key;
}
function defaultGetLabel(item) {
  return item?.label;
}
export default function SegmentedControl({
  className = '',
  classNames = {},
  getLabel = defaultGetLabel,
  getKey = defaultGetKey,
  items = [],
  onChange,
  value,
  renderSuffix
}) {
  const wrapperRef = useRef(null);
  const buttonRefs = useRef(new Map());
  const trackRef = useDraggableScroll();
  const [indicatorFrame, setIndicatorFrame] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    ready: false
  });
  const resolvedItems = useMemo(() => Array.isArray(items) ? items : [], [items]);
  const activeItemKey = useMemo(() => {
    if (!resolvedItems.length) {
      return null;
    }
    const fallbackItem = resolvedItems[0];
    const activeKey = value ?? getKey(fallbackItem);
    return getKey(resolvedItems.find(item => getKey(item) === activeKey) || fallbackItem);
  }, [getKey, resolvedItems, value]);
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const activeButton = buttonRefs.current.get(activeItemKey);
    if (!wrapper || !activeButton) {
      setIndicatorFrame(current => ({
        ...current,
        ready: false
      }));
      return undefined;
    }
    const updateIndicatorFrame = () => {
      const nextX = activeButton.offsetLeft;
      const nextY = activeButton.offsetTop;
      const nextWidth = activeButton.offsetWidth;
      const nextHeight = activeButton.offsetHeight;
      setIndicatorFrame(current => {
        if (current.x === nextX && current.y === nextY && current.width === nextWidth && current.height === nextHeight && current.ready) {
          return current;
        }
        return {
          x: nextX,
          y: nextY,
          width: nextWidth,
          height: nextHeight,
          ready: true
        };
      });
    };
    updateIndicatorFrame();
    const resizeObserver = new ResizeObserver(updateIndicatorFrame);
    resizeObserver.observe(wrapper);
    resizeObserver.observe(activeButton);
    return () => {
      resizeObserver.disconnect();
    };
  }, [activeItemKey, resolvedItems]);
  useEffect(() => {
    const activeButton = buttonRefs.current.get(activeItemKey);
    const track = trackRef.current;
    if (!activeButton || !track) {
      return;
    }
    const trackWidth = track.clientWidth;
    const scrollLeft = track.scrollLeft;
    const buttonLeft = activeButton.offsetLeft;
    const buttonWidth = activeButton.offsetWidth;
    if (buttonLeft < scrollLeft) {
      track.scrollTo({
        left: buttonLeft - 16,
        behavior: 'smooth'
      });
    } else if (buttonLeft + buttonWidth > scrollLeft + trackWidth) {
      track.scrollTo({
        left: buttonLeft + buttonWidth - trackWidth + 16,
        behavior: 'smooth'
      });
    }
  }, [activeItemKey, trackRef]);
  if (!resolvedItems.length) {
    return null;
  }
  return <div className={cn('flex items-center min-w-0', className)}>
      <div ref={trackRef} onDragStart={event => event.preventDefault()} className={cn('hide-scrollbar w-full overflow-x-auto cursor-grab select-none touch-pan-x', classNames.track)}>
        <div ref={wrapperRef} className={cn('relative inline-flex min-w-full items-stretch gap-1 border border-black/5 bg-black/5', 'p-1', classNames.wrapper)}>
          <span aria-hidden="true" className={cn('bg-primary pointer-events-none absolute top-0 left-0', classNames.indicator)} />
          {resolvedItems.map(item => {
          const itemKey = getKey(item);
          const isActive = activeItemKey === itemKey;
          return <button key={itemKey} type="button" ref={node => {
            if (node) {
              buttonRefs.current.set(itemKey, node);
              return;
            }
            buttonRefs.current.delete(itemKey);
          }} onClick={() => onChange?.(itemKey)} className={cn("relative isolate z-10 cursor-pointer appearance-none border-0 bg-transparent px-3 py-1 text-[11px] font-medium whitespace-nowrap", isActive ? classNames.active || 'text-black' : classNames.inactive || 'text-black/70', classNames.button)}>
                <span className="relative z-10 inline-flex items-center gap-1">
                  {getLabel(item)}
                  {typeof renderSuffix === 'function' ? renderSuffix(item) : null}
                </span>
              </button>;
        })}
        </div>
      </div>
    </div>;
}
