'use client';

import { useEffect, useRef } from 'react';

const HEIGHT_EPSILON = 0.5;

function getObservedHeight(entry, element) {
  const borderBoxSize = Array.isArray(entry?.borderBoxSize) ? entry.borderBoxSize[0] : entry?.borderBoxSize;

  return borderBoxSize?.blockSize || element?.offsetHeight || 0;
}

function hasMeaningfulHeightChange(previousHeight, nextHeight) {
  return Math.abs(nextHeight - previousHeight) > HEIGHT_EPSILON;
}

export function useElementHeight(onHeightChange, elementRef, shouldMeasure, dependencyKey = null) {
  const lastHeightRef = useRef(0);

  useEffect(() => {
    if (!onHeightChange) {
      return;
    }

    if (!shouldMeasure) {
      lastHeightRef.current = 0;
      onHeightChange(0);
      return;
    }

    const element = elementRef?.current;

    if (!element) {
      return;
    }

    function publishHeight(nextHeight) {
      if (!hasMeaningfulHeightChange(lastHeightRef.current, nextHeight)) {
        return;
      }

      lastHeightRef.current = nextHeight;
      onHeightChange(nextHeight);
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        publishHeight(getObservedHeight(entry, element));
      }
    });

    observer.observe(element);
    publishHeight(element.offsetHeight || 0);

    return () => {
      observer.disconnect();
    };
  }, [dependencyKey, elementRef, onHeightChange, shouldMeasure]);
}
