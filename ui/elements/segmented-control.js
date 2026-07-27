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

const PADDING = 2;
const BORDER_WIDTH = 1;
const OUTER_RADIUS = 12;
const INNER_RADIUS = OUTER_RADIUS - PADDING - BORDER_WIDTH;

export default function SegmentedControl({
  className = '',
  classNames = {},
  getLabel = defaultGetLabel,
  getKey = defaultGetKey,
  items = [],
  onChange,
  value,
  renderSuffix,
}) {
  const wrapperRef = useRef(null);
  const buttonRefs = useRef(new Map());
  const trackRef = useDraggableScroll();
  const [indicator, setIndicator] = useState(null);

  const resolvedItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  const activeItemKey = useMemo(() => {
    if (!resolvedItems.length) {
      return null;
    }
    const fallbackItem = resolvedItems[0];
    const activeKey = value ?? getKey(fallbackItem);
    return getKey(resolvedItems.find((item) => getKey(item) === activeKey) || fallbackItem);
  }, [getKey, resolvedItems, value]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const activeButton = buttonRefs.current.get(activeItemKey);

    if (!wrapper || !activeButton) {
      setIndicator(null);
      return undefined;
    }

    const update = () => {
      const wrapperRect = wrapper.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();

      const x = buttonRect.left - wrapperRect.left;
      const w = buttonRect.width;

      setIndicator((prev) => {
        if (prev && prev._x === x && prev._w === w) {
          return prev;
        }
        return {
          _x: x,
          _w: w,
          ready: Boolean(prev),
        };
      });
    };

    update();

    const ro = new ResizeObserver(update);
    ro.observe(wrapper);
    ro.observe(activeButton);
    return () => ro.disconnect();
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
      track.scrollTo({ left: buttonLeft - 16, behavior: 'smooth' });
    } else if (buttonLeft + buttonWidth > scrollLeft + trackWidth) {
      track.scrollTo({ left: buttonLeft + buttonWidth - trackWidth + 16, behavior: 'smooth' });
    }
  }, [activeItemKey, trackRef]);

  if (!resolvedItems.length) {
    return null;
  }

  return (
    <div
      style={{ padding: `${PADDING}px`, borderRadius: `${OUTER_RADIUS}px` }}
      className={cn(
        'flex min-w-0 items-stretch border border-black/5 bg-black/5',
        className,
        classNames.wrapper,
      )}
    >
      <div
        ref={trackRef}
        onDragStart={(event) => event.preventDefault()}
        className={cn(
          'hide-scrollbar h-full w-full cursor-grab touch-pan-x overflow-x-auto select-none',
          classNames.track,
        )}
      >
        <div
          ref={wrapperRef}
          className="relative flex h-full w-max min-w-full items-stretch overflow-hidden"
          style={{ borderRadius: `${INNER_RADIUS}px` }}
        >
          <span
            aria-hidden="true"
            className={cn(
              'bg-primary pointer-events-none absolute inset-y-0 left-0',
              classNames.indicator,
            )}
            style={{
              borderRadius: `${INNER_RADIUS}px`,
              ...(indicator
                ? {
                    transform: `translateX(${indicator._x}px)`,
                    width: `${indicator._w}px`,
                    transition: 'none',
                  }
                : { width: 0, opacity: 0 }),
            }}
          />

          {resolvedItems.map((item) => {
            const itemKey = getKey(item);
            const isActive = activeItemKey === itemKey;
            return (
              <button
                key={itemKey}
                type="button"
                ref={(node) => {
                  if (node) {
                    buttonRefs.current.set(itemKey, node);
                    return;
                  }
                  buttonRefs.current.delete(itemKey);
                }}
                onClick={() => onChange?.(itemKey)}
                className={cn(
                  'relative isolate z-10 cursor-pointer appearance-none border-0 bg-transparent px-3 py-1 text-[11px] font-medium whitespace-nowrap',
                  isActive
                    ? classNames.active || 'text-black'
                    : classNames.inactive || 'text-black/70',
                  classNames.button,
                )}
                style={{ borderRadius: `${INNER_RADIUS}px` }}
              >
                <span className="relative z-10 inline-flex items-center gap-1">
                  {getLabel(item)}
                  {typeof renderSuffix === 'function' ? renderSuffix(item) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
