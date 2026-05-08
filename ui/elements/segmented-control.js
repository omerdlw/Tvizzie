'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/core/utils';

function defaultGetKey(item) {
  return item?.key;
}

function defaultGetLabel(item) {
  return item?.label;
}

function hasPaddingOverride(className) {
  return typeof className === 'string' && /\bp(?:x|y|s|e|t|r|b|l)?-/.test(className);
}

function parsePixelValue(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function SegmentedControl({
  classNames = {},
  equalItems = false,
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
  const hasCustomWrapperPadding = hasPaddingOverride(classNames.wrapper);
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
      const wrapperStyle = window.getComputedStyle(wrapper);
      const shouldUseEqualItemFrame =
        equalItems || wrapperStyle.getPropertyValue('--segmented-control-equal-items').trim() === '1';
      let nextX = activeButton.offsetLeft;
      let nextY = activeButton.offsetTop;
      let nextWidth = activeButton.offsetWidth;
      let nextHeight = activeButton.offsetHeight;

      if (shouldUseEqualItemFrame) {
        const activeIndex = Math.max(
          0,
          resolvedItems.findIndex((item) => getKey(item) === activeItemKey)
        );
        const itemCount = Math.max(1, resolvedItems.length);
        const paddingLeft = parsePixelValue(wrapperStyle.paddingLeft);
        const paddingRight = parsePixelValue(wrapperStyle.paddingRight);
        const paddingTop = parsePixelValue(wrapperStyle.paddingTop);
        const paddingBottom = parsePixelValue(wrapperStyle.paddingBottom);
        const gap = parsePixelValue(wrapperStyle.columnGap || wrapperStyle.gap);
        const contentWidth = Math.max(0, wrapper.clientWidth - paddingLeft - paddingRight);
        const contentHeight = Math.max(0, wrapper.clientHeight - paddingTop - paddingBottom);
        const availableWidth = Math.max(0, contentWidth - gap * (itemCount - 1));
        const start = paddingLeft + (availableWidth * activeIndex) / itemCount + gap * activeIndex;
        const end = paddingLeft + (availableWidth * (activeIndex + 1)) / itemCount + gap * activeIndex;

        nextX = start;
        nextY = paddingTop;
        nextWidth = Math.max(0, end - start);
        nextHeight = contentHeight;
      }

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
  }, [activeItemKey, getKey, resolvedItems]);

  if (!resolvedItems.length) {
    return null;
  }

  return (
    <div className="flex w-auto items-center">
      <div className={cn('hide-scrollbar w-auto overflow-x-auto', classNames.track)}>
        <div
          ref={wrapperRef}
          className={cn(
            'relative flex h-7 w-auto min-w-full items-stretch gap-1 border border-white/5 bg-white/5',
            !hasCustomWrapperPadding && 'p-0.5',
            classNames.wrapper
          )}
        >
          <span
            aria-hidden="true"
            className={cn('pointer-events-none absolute top-0 left-0 bg-white/10', classNames.indicator)}
            style={
              indicatorFrame.ready
                ? {
                    transform: `translate3d(${indicatorFrame.x}px, ${indicatorFrame.y}px, 0)`,
                    width: indicatorFrame.width,
                    height: indicatorFrame.height,
                    opacity: 1,
                  }
                : {
                    opacity: 0,
                  }
            }
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
                  'relative isolate z-10 inline-flex cursor-pointer appearance-none items-center justify-center border-0 bg-transparent px-3 py-1 text-[11px] leading-none font-medium whitespace-nowrap transition-colors duration-200',
                  equalItems && 'min-w-0 flex-1 basis-0',
                  isActive ? classNames.active || 'text-white' : classNames.inactive || 'text-white/70',
                  classNames.button
                )}
              >
                <span className="relative z-10 inline-flex items-center justify-center gap-1 leading-none">
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
