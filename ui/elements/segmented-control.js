'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { motion } from 'framer-motion';
import { cn } from '@/core/utils';

function defaultGetKey(item) {
  return item?.key;
}

function defaultGetLabel(item) {
  return item?.label;
}

export default function SegmentedControl({
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
  const [indicatorFrame, setIndicatorFrame] = useState({ x: 0, y: 0, width: 0, height: 0, ready: false });
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
      setIndicatorFrame((current) => ({ ...current, ready: false }));
      return undefined;
    }

    const updateIndicatorFrame = () => {
      const nextX = activeButton.offsetLeft;
      const nextY = activeButton.offsetTop;
      const nextWidth = activeButton.offsetWidth;
      const nextHeight = activeButton.offsetHeight;

      setIndicatorFrame((current) => {
        if (
          current.x === nextX &&
          current.y === nextY &&
          current.width === nextWidth &&
          current.height === nextHeight &&
          current.ready
        ) {
          return current;
        }

        return {
          x: nextX,
          y: nextY,
          width: nextWidth,
          height: nextHeight,
          ready: true,
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

  if (!resolvedItems.length) {
    return null;
  }

  return (
    <div className="flex items-center">
      <div className={cn('hide-scrollbar w-full overflow-x-auto', classNames.track)}>
        <div
          ref={wrapperRef}
          className={cn(
            'relative flex min-w-full items-stretch gap-1 border border-black/5 bg-black/5',
            'p-1',
            classNames.wrapper
          )}
        >
          <motion.span
            aria-hidden="true"
            className={cn('bg-primary pointer-events-none absolute top-0 left-0', classNames.indicator)}
            initial={false}
            animate={
              indicatorFrame.ready
                ? {
                    x: indicatorFrame.x,
                    y: indicatorFrame.y,
                    width: indicatorFrame.width,
                    height: indicatorFrame.height,
                    opacity: 1,
                  }
                : {
                    opacity: 0,
                  }
            }
            transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.75 }}
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
                  'relative isolate z-10 cursor-pointer appearance-none border-0 bg-transparent px-3 py-1 text-[11px] font-medium whitespace-nowrap transition-colors duration-[200ms]',
                  isActive ? classNames.active || 'text-black' : classNames.inactive || 'text-black/70',
                  classNames.button
                )}
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
