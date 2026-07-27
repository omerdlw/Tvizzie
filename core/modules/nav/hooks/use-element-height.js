'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const HEIGHT_EPSILON = 2.0;

function getObservedHeight(entry, element) {
  const borderBoxSize = Array.isArray(entry?.borderBoxSize)
    ? entry.borderBoxSize[0]
    : entry?.borderBoxSize;

  if (borderBoxSize?.blockSize != null) {
    return Math.round(borderBoxSize.blockSize);
  }

  if (entry?.contentRect?.height != null) {
    return Math.round(entry.contentRect.height);
  }

  return Math.round(element?.offsetHeight || 0);
}

function hasMeaningfulHeightChange(previousHeight, nextHeight) {
  return Math.abs(Math.round(nextHeight) - Math.round(previousHeight)) > HEIGHT_EPSILON;
}

export function useElementHeight(onHeightChange, elementRef, shouldMeasure, dependencyKey = null) {
  const lastHeightRef = useRef(0);
  const rafRef = useRef(null);
  const callbackRef = useRef(onHeightChange);

  useEffect(() => {
    callbackRef.current = onHeightChange;
  });

  useIsomorphicLayoutEffect(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    lastHeightRef.current = -1;

    if (!callbackRef.current) return;

    if (!shouldMeasure) {
      if (hasMeaningfulHeightChange(lastHeightRef.current, 0)) {
        lastHeightRef.current = 0;
        callbackRef.current(0);
      }
      return;
    }

    const element = elementRef?.current;
    if (!element) return;

    function publishHeight(nextHeight) {
      if (!hasMeaningfulHeightChange(lastHeightRef.current, nextHeight)) return;
      lastHeightRef.current = nextHeight;
      callbackRef.current?.(nextHeight);
    }

    let pendingHeight = null;
    let settleTimer = null;

    function flushPendingHeight() {
      rafRef.current = null;

      if (pendingHeight == null) {
        return;
      }

      const heightToPublish = pendingHeight;
      pendingHeight = null;

      publishHeight(heightToPublish);
    }

    function scheduleMeasurement(nextHeight) {
      pendingHeight = nextHeight;

      if (rafRef.current !== null) {
        return;
      }

      rafRef.current = requestAnimationFrame(flushPendingHeight);
    }

    
    const initialMeasuredHeight = element.offsetHeight || 0;
    if (initialMeasuredHeight > 0) {
      publishHeight(initialMeasuredHeight);
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        scheduleMeasurement(getObservedHeight(entry, element));
      }
    });

    observer.observe(element);

    const handlePageShow = () => {
      scheduleMeasurement(element.offsetHeight || 0);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      handlePageShow();
    };

    window.addEventListener('pageshow', handlePageShow);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      observer.disconnect();
      window.removeEventListener('pageshow', handlePageShow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      if (settleTimer !== null) {
        clearTimeout(settleTimer);
        settleTimer = null;
      }
    };
  }, [dependencyKey, elementRef, shouldMeasure]);
}
