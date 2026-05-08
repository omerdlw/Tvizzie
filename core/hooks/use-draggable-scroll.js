'use client';

import { useEffect, useId, useRef } from 'react';

const SMOOTH_SCROLL_LOCK_EVENT = 'tvizzie:smooth-scroll-lock';
const DRAG_SPEED = 1.35;
const DRAG_THRESHOLD = 6;
const WHEEL_IDLE_DELAY = 120;
const PIXELS_PER_LINE = 16;
const DOM_DELTA_LINE = 1;
const DOM_DELTA_PAGE = 2;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getMaxScrollLeft(element) {
  return Math.max(0, element.scrollWidth - element.clientWidth);
}

function getWheelDelta(event, element) {
  const hasHorizontalIntent = Math.abs(event.deltaX) > 0 && Math.abs(event.deltaX) >= Math.abs(event.deltaY) * 0.45;
  const axisDelta = hasHorizontalIntent ? event.deltaX : event.shiftKey ? event.deltaY : 0;

  if (!axisDelta) {
    return 0;
  }

  if (event.deltaMode === DOM_DELTA_LINE) {
    return axisDelta * PIXELS_PER_LINE;
  }

  if (event.deltaMode === DOM_DELTA_PAGE) {
    return axisDelta * element.clientWidth;
  }

  return axisDelta;
}

function eventPathIncludes(event, element) {
  if (typeof event.composedPath === 'function') {
    return event.composedPath().includes(element);
  }

  return element.contains(event.target);
}

export function useDraggableScroll() {
  const ref = useRef(null);
  const lockSource = `carousel-${useId()}`;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    let isDragging = false;
    let wheelIdleTimeout = 0;
    let lastPointerX = 0;
    let lastPointerTime = 0;
    let pointerVelocity = 0;
    let isWheelActive = false;
    let isSmoothScrollLocked = false;

    const setSmoothScrollLocked = (locked) => {
      if (isSmoothScrollLocked === locked) return;

      isSmoothScrollLocked = locked;
      window.dispatchEvent(
        new CustomEvent(SMOOTH_SCROLL_LOCK_EVENT, {
          detail: {
            locked,
            source: lockSource,
          },
        })
      );
    };

    const restoreScrollBehavior = () => {
      if (isDown || isWheelActive) return;
      el.style.scrollBehavior = '';
    };

    const suppressNativeSmooth = () => {
      el.style.scrollBehavior = 'auto';
    };

    const releaseInteraction = () => {
      if (isDown || isWheelActive) return;
      setSmoothScrollLocked(false);
    };

    const handleMouseDown = (e) => {
      isDown = true;
      isDragging = false;
      el.classList.add('cursor-grabbing');
      el.classList.remove('cursor-pointer');
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
      lastPointerX = e.pageX;
      lastPointerTime = performance.now();
      pointerVelocity = 0;
      suppressNativeSmooth();
    };

    const handleMouseLeave = () => {
      isDown = false;
      el.classList.remove('cursor-grabbing');
      restoreScrollBehavior();
      releaseInteraction();
    };

    const handleMouseUp = () => {
      isDown = false;
      el.classList.remove('cursor-grabbing');

      if (isDragging) {
        el.scrollLeft = clamp(el.scrollLeft - pointerVelocity * 220, 0, getMaxScrollLeft(el));
        restoreScrollBehavior();
        releaseInteraction();
      } else {
        restoreScrollBehavior();
        releaseInteraction();
      }

      setTimeout(() => {
        isDragging = false;
      }, 0);
    };

    const handleMouseMove = (e) => {
      if (!isDown) return;

      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX) * DRAG_SPEED;
      const now = performance.now();
      const elapsed = Math.max(1, now - lastPointerTime);

      pointerVelocity = (e.pageX - lastPointerX) / elapsed;
      lastPointerX = e.pageX;
      lastPointerTime = now;

      if (Math.abs(walk) > DRAG_THRESHOLD) {
        isDragging = true;
        setSmoothScrollLocked(true);
      }

      if (isDragging) {
        e.preventDefault();
        el.scrollLeft = clamp(scrollLeft - walk, 0, getMaxScrollLeft(el));
      }
    };

    const handleWheel = (e) => {
      if (!eventPathIncludes(e, el)) return;

      const maxScrollLeft = getMaxScrollLeft(el);
      if (!maxScrollLeft) return;

      const delta = getWheelDelta(e, el);
      const canMove = (delta > 0 && el.scrollLeft < maxScrollLeft - 1) || (delta < 0 && el.scrollLeft > 1);

      if (!canMove) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
      isWheelActive = true;
      setSmoothScrollLocked(true);
      suppressNativeSmooth();
      el.scrollLeft = clamp(el.scrollLeft + delta * 0.9, 0, maxScrollLeft);

      window.clearTimeout(wheelIdleTimeout);
      wheelIdleTimeout = window.setTimeout(() => {
        isWheelActive = false;
        restoreScrollBehavior();
        releaseInteraction();
      }, WHEEL_IDLE_DELAY);
    };

    const handleBlur = (e) => {
      if (isDragging) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    el.addEventListener('mousedown', handleMouseDown);
    el.addEventListener('mouseleave', handleMouseLeave);
    el.addEventListener('mouseup', handleMouseUp);
    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('wheel', handleWheel, { capture: true, passive: false });
    window.addEventListener('wheel', handleWheel, { capture: true, passive: false });
    el.addEventListener('click', handleBlur, true);

    return () => {
      window.clearTimeout(wheelIdleTimeout);
      setSmoothScrollLocked(false);
      el.removeEventListener('mousedown', handleMouseDown);
      el.removeEventListener('mouseleave', handleMouseLeave);
      el.removeEventListener('mouseup', handleMouseUp);
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('wheel', handleWheel, true);
      window.removeEventListener('wheel', handleWheel, true);
      el.removeEventListener('click', handleBlur, true);
    };
  }, [lockSource]);

  return ref;
}
