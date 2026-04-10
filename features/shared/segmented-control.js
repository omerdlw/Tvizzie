'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/core/utils';

const DRAG_THRESHOLD = 4;

function defaultGetKey(item) {
  return item?.key;
}

function defaultGetLabel(item) {
  return item?.label;
}

export default function SegmentedControl({
  inactiveClassName = 'text-black/70',
  activeClassName = 'text-black',
  activeIndicatorClassName = 'bg-primary',
  getLabel = defaultGetLabel,
  getKey = defaultGetKey,
  getButtonClassName,
  buttonClassName,
  trackClassName,
  items = [],
  className,
  onChange,
  value,
  renderSuffix,
}) {
  const reduceMotion = useReducedMotion();
  const scrollRef = useRef(null);
  const itemRefs = useRef(new Map());
  const isPointerDownRef = useRef(false);
  const isDraggingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const [indicator, setIndicator] = useState({
    x: 0,
    width: 0,
    visible: false,
  });

  const updateIndicator = useCallback(() => {
    const trackElement = scrollRef.current;
    if (!trackElement) {
      return;
    }

    const activeElement = itemRefs.current.get(value);
    if (!activeElement) {
      setIndicator((current) => (current.visible ? { ...current, visible: false } : current));
      return;
    }

    const nextX = activeElement.offsetLeft - trackElement.scrollLeft;
    const nextWidth = activeElement.offsetWidth;

    setIndicator({
      x: nextX,
      width: nextWidth,
      visible: true,
    });
  }, [value]);

  useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator, items, value]);

  useEffect(() => {
    const trackElement = scrollRef.current;
    if (!trackElement) {
      return undefined;
    }

    let frameId = null;
    const requestUpdate = () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      frameId = requestAnimationFrame(() => {
        updateIndicator();
      });
    };

    const resizeObserver = new ResizeObserver(requestUpdate);
    resizeObserver.observe(trackElement);
    itemRefs.current.forEach((element) => {
      resizeObserver.observe(element);
    });

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      resizeObserver.disconnect();
    };
  }, [items, updateIndicator]);

  const handleMouseDown = useCallback((event) => {
    const element = scrollRef.current;
    if (!element) return;

    isPointerDownRef.current = true;
    isDraggingRef.current = false;
    suppressClickRef.current = false;
    startXRef.current = event.pageX - element.offsetLeft;
    startScrollLeftRef.current = element.scrollLeft;

    element.style.scrollBehavior = 'auto';
    element.style.cursor = 'grabbing';
  }, []);

  const handleMouseMove = useCallback((event) => {
    if (!isPointerDownRef.current) return;

    const element = scrollRef.current;
    if (!element) return;

    const currentX = event.pageX - element.offsetLeft;
    const delta = (currentX - startXRef.current) * 1.5;

    if (Math.abs(delta) > DRAG_THRESHOLD) {
      isDraggingRef.current = true;
      suppressClickRef.current = true;
    }

    if (!isDraggingRef.current) return;

    event.preventDefault();
    element.scrollLeft = startScrollLeftRef.current - delta;
  }, []);

  const handleMouseUp = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;

    isPointerDownRef.current = false;
    element.style.cursor = '';
    element.style.scrollBehavior = '';

    setTimeout(() => {
      isDraggingRef.current = false;
    }, 0);
  }, []);

  const handleClickCapture = useCallback((event) => {
    if (!isDraggingRef.current && !suppressClickRef.current) return;

    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
  }, []);

  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex items-center', className)}>
      <div
        ref={scrollRef}
        onScroll={updateIndicator}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClickCapture={handleClickCapture}
        onDragStart={(e) => e.preventDefault()}
        className={cn(
          'hide-scrollbar relative flex items-center gap-1 overflow-x-auto rounded-[12px] border border-black/5 bg-black/5 p-0.5 select-none',
          trackClassName
        )}
      >
        <motion.span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute top-0.5 bottom-0.5 left-0 z-0 rounded-[9px]',
            activeIndicatorClassName
          )}
          initial={false}
          animate={{
            x: indicator.x,
            width: indicator.width,
            opacity: indicator.visible ? 1 : 0,
          }}
          transition={
            reduceMotion
              ? { duration: 0.12 }
              : { type: 'spring', stiffness: 380, damping: 34, mass: 0.75 }
          }
        />
        {items.map((item) => {
          const itemKey = getKey(item);
          const isActive = value === itemKey;

          return (
            <motion.button
              key={itemKey}
              ref={(element) => {
                if (element) {
                  itemRefs.current.set(itemKey, element);
                } else {
                  itemRefs.current.delete(itemKey);
                }
              }}
              type="button"
              onClick={() => onChange?.(itemKey)}
              whileTap={reduceMotion ? undefined : { scale: 0.985 }}
              className={cn(
                'relative z-10 isolate cursor-pointer rounded-[9px] px-3 py-1 text-[11px]! font-medium whitespace-nowrap transition-colors duration-(--motion-duration-fast)',
                isActive ? activeClassName : inactiveClassName,
                buttonClassName,
                typeof getButtonClassName === 'function' ? getButtonClassName(item, isActive) : null
              )}
            >
              <span className="relative z-10 inline-flex items-center gap-1">
                {getLabel(item)}
                {typeof renderSuffix === 'function' ? renderSuffix(item) : null}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
