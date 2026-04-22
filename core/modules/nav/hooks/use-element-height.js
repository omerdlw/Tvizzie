'use client';

import { useEffect, useRef } from 'react';

const HEIGHT_EPSILON = 0.5;

function getObservedHeight(entry, element) {
  const borderBoxSize = Array.isArray(entry?.borderBoxSize) ? entry.borderBoxSize[0] : entry?.borderBoxSize;

  if (borderBoxSize?.blockSize != null) {
    return borderBoxSize.blockSize;
  }

  if (entry?.contentRect?.height != null) {
    return entry.contentRect.height;
  }

  return element?.offsetHeight || 0;
}

function hasMeaningfulHeightChange(previousHeight, nextHeight) {
  return Math.abs(nextHeight - previousHeight) > HEIGHT_EPSILON;
}

export function useElementHeight(onHeightChange, elementRef, shouldMeasure, dependencyKey = null) {
  const lastHeightRef = useRef(0);
  const rafRef = useRef(null);
  const callbackRef = useRef(onHeightChange);

  useEffect(() => {
    callbackRef.current = onHeightChange;
  });

  useEffect(() => {
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

    function flushPendingHeight() {
      rafRef.current = null;

      if (pendingHeight == null) {
        return;
      }

      publishHeight(pendingHeight);
      pendingHeight = null;
    }

    function scheduleMeasurement(nextHeight) {
      pendingHeight = nextHeight;

      if (rafRef.current !== null) {
        return;
      }

      rafRef.current = requestAnimationFrame(flushPendingHeight);
    }

    function measureElement() {
      scheduleMeasurement(element.offsetHeight || 0);
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        scheduleMeasurement(getObservedHeight(entry, element));
      }
    });

    observer.observe(element);
    measureElement();

    const handlePageShow = () => {
      measureElement();
      requestAnimationFrame(measureElement);
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
    };
  }, [dependencyKey, elementRef, shouldMeasure]);
}
