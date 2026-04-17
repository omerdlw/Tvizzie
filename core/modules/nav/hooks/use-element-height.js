'use client';

import { useEffect, useRef } from 'react';

// Ignore height changes smaller than this to avoid spurious reflows
const HEIGHT_EPSILON = 0.5;

// ─── Measurement helpers ──────────────────────────────────────────────────────

/**
 * Prefer borderBoxSize (layout-accurate), fall back to offsetHeight.
 * Some browsers (older Safari) don't populate borderBoxSize — we handle both.
 */
function getObservedHeight(entry, element) {
  const borderBoxSize = Array.isArray(entry?.borderBoxSize) ? entry.borderBoxSize[0] : entry?.borderBoxSize;

  if (borderBoxSize?.blockSize != null) {
    return borderBoxSize.blockSize;
  }

  // contentRect is always available and reliable as a fallback
  if (entry?.contentRect?.height != null) {
    return entry.contentRect.height;
  }

  return element?.offsetHeight || 0;
}

function hasMeaningfulHeightChange(previousHeight, nextHeight) {
  return Math.abs(nextHeight - previousHeight) > HEIGHT_EPSILON;
}

// ─── useElementHeight ─────────────────────────────────────────────────────────
//
// Observes an element's height via ResizeObserver and calls onHeightChange
// whenever a meaningful change is detected.
//
// Key improvements over the original:
//  • rAF-batches ResizeObserver callbacks so rapid multi-entry bursts
//    (e.g. simultaneous action + content resize) collapse into one call
//    per frame, preventing the intermediate-wrong-height bug.
//  • Cleans up the pending rAF on disconnect so we never fire a stale
//    measurement after unmount or dependency change.
//  • Falls back gracefully when borderBoxSize is unavailable.

export function useElementHeight(onHeightChange, elementRef, shouldMeasure, dependencyKey = null) {
  const lastHeightRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    // Cancel any pending rAF from a previous render cycle
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (!onHeightChange) return;

    if (!shouldMeasure) {
      // Reset: report zero so parent can recompute
      if (hasMeaningfulHeightChange(lastHeightRef.current, 0)) {
        lastHeightRef.current = 0;
        onHeightChange(0);
      }
      return;
    }

    const element = elementRef?.current;
    if (!element) return;

    function publishHeight(nextHeight) {
      if (!hasMeaningfulHeightChange(lastHeightRef.current, nextHeight)) return;
      lastHeightRef.current = nextHeight;
      onHeightChange(nextHeight);
    }

    // Batch ResizeObserver entries within a single animation frame.
    // This is the critical fix: when both content and action resize at the
    // same time, we only run publishHeight once with the final settled value.
    let pendingHeight = null;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        pendingHeight = getObservedHeight(entry, element);
      }

      if (rafRef.current !== null) return; // already scheduled

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;

        if (pendingHeight !== null) {
          publishHeight(pendingHeight);
          pendingHeight = null;
        }
      });
    });

    observer.observe(element);

    // Measure immediately (synchronously) so the initial render has the
    // correct height without waiting for the first observer callback.
    publishHeight(element.offsetHeight || 0);

    return () => {
      observer.disconnect();

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [dependencyKey, elementRef, onHeightChange, shouldMeasure]);
}
