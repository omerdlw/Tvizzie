'use client';

import { useCallback, useId, useRef } from 'react';

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
  const indicatorId = useId().replace(/:/g, '');
  const scrollRef = useRef(null);
  const isPointerDownRef = useRef(false);
  const isDraggingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);

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
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClickCapture={handleClickCapture}
        onDragStart={(e) => e.preventDefault()}
        className={cn(
          'hide-scrollbar flex items-center gap-1 overflow-x-auto rounded-[12px] border border-black/5 bg-black/5 p-0.5 select-none',
          trackClassName
        )}
      >
        {items.map((item) => {
          const itemKey = getKey(item);
          const isActive = value === itemKey;

          return (
            <motion.button
              key={itemKey}
              type="button"
              onClick={() => onChange?.(itemKey)}
              whileTap={reduceMotion ? undefined : { scale: 0.985 }}
              className={cn(
                'relative isolate cursor-pointer overflow-hidden rounded-[9px] px-3 py-1 text-[11px]! font-medium whitespace-nowrap transition-colors duration-(--motion-duration-fast)',
                isActive ? activeClassName : inactiveClassName,
                buttonClassName,
                typeof getButtonClassName === 'function' ? getButtonClassName(item, isActive) : null
              )}
            >
              {isActive && (
                <motion.span
                  layoutId={`segmented-control-indicator-${indicatorId}`}
                  className={cn(
                    'absolute inset-0 -z-10 rounded-[9px] shadow-[0_0_0_1px_rgba(15,23,42,0.08)]',
                    activeIndicatorClassName
                  )}
                  transition={
                    reduceMotion ? { duration: 0.12 } : { type: 'spring', stiffness: 380, damping: 34, mass: 0.75 }
                  }
                />
              )}

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
