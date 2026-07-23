'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { NAV_CARD_LAYOUT, NAV_HEIGHT_BUFFER } from '../layout';
import {
  getContainerHeight,
  getDistanceToBottom,
  NAV_SPACER_BOTTOM_LOCK_DISTANCE,
} from '../layout';

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function useNavHeightController({
  activeItemIsOverlay,
  activeItemLayoutKey,
  compact,
  pathname,
  setNavHeight,
}) {
  const [containerHeight, setContainerHeight] = useState(NAV_CARD_LAYOUT.baseHeight);

  const heightRef = useRef({ content: 0 });
  const rafRef = useRef(null);
  const compactRef = useRef(compact);
  const previousPathRef = useRef(pathname);
  const previousActiveItemLayoutKeyRef = useRef(activeItemLayoutKey);

  compactRef.current = compact;

  const applyHeight = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const { content } = heightRef.current;
    const height = getContainerHeight({
      cardContentHeight: content,
      compact: compactRef.current,
    });
    const isBottomLockedForSpacer = getDistanceToBottom() <= NAV_SPACER_BOTTOM_LOCK_DISTANCE;
    const spacerBaseHeight = isBottomLockedForSpacer ? NAV_CARD_LAYOUT.compactHeight : height;

    setContainerHeight(height);
    setNavHeight(spacerBaseHeight + NAV_HEIGHT_BUFFER);
  }, [setNavHeight]);

  const handleContentHeightChange = useCallback(
    (height) => {
      heightRef.current.content = height;
      if (compactRef.current) return;

      applyHeight();
    },
    [applyHeight],
  );

  const resetHeights = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    heightRef.current = { content: 0 };
    setContainerHeight(NAV_CARD_LAYOUT.baseHeight);
    setNavHeight(NAV_CARD_LAYOUT.baseHeight + NAV_HEIGHT_BUFFER);
  }, [setNavHeight]);

  const transitionTimeoutRef = useRef(null);
  const isTransitioningRef = useRef(false);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  useIsomorphicLayoutEffect(() => {
    isTransitioningRef.current = true;
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    transitionTimeoutRef.current = setTimeout(() => {
      isTransitioningRef.current = false;
      if (!compactRef.current) {
        applyHeight();
      }
    }, 350);

    if (compact) {
      // When entering compact mode, snap immediately to compact height.
      // Content stays in the DOM (hidden via opacity) so its height
      // continues to be measured and cached in heightRef.
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      const compactHeight = NAV_CARD_LAYOUT.compactHeight;
      setContainerHeight(compactHeight);
      setNavHeight(compactHeight + NAV_HEIGHT_BUFFER);
      return;
    }

    // When leaving compact mode, the cached content height is already
    // up-to-date because content remained in the DOM. Apply immediately.
    applyHeight();
  }, [compact, applyHeight, setNavHeight]);

  useIsomorphicLayoutEffect(() => {
    if (previousPathRef.current === pathname) return;
    previousPathRef.current = pathname;
    resetHeights();
  }, [pathname, resetHeights]);

  useIsomorphicLayoutEffect(() => {
    if (activeItemIsOverlay) return;
    if (previousActiveItemLayoutKeyRef.current === activeItemLayoutKey) return;
    previousActiveItemLayoutKeyRef.current = activeItemLayoutKey;
    applyHeight();
  }, [activeItemIsOverlay, activeItemLayoutKey, applyHeight]);

  return {
    containerHeight,
    handleContentHeightChange,
  };
}
