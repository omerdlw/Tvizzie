'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import {
  getContainerHeight,
  getDistanceToBottom,
  NAV_CARD_LAYOUT,
  NAV_HEIGHT_BUFFER,
  NAV_SPACER_BOTTOM_LOCK_DISTANCE,
} from '../nav-layout';

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

  const lastAppliedContainerHeightRef = useRef(NAV_CARD_LAYOUT.baseHeight);
  const lastAppliedSpacerHeightRef = useRef(NAV_CARD_LAYOUT.baseHeight + NAV_HEIGHT_BUFFER);

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
    const totalSpacerHeight = spacerBaseHeight + NAV_HEIGHT_BUFFER;

    if (Math.abs(height - lastAppliedContainerHeightRef.current) > 2.0) {
      lastAppliedContainerHeightRef.current = height;
      setContainerHeight(height);
    }

    if (Math.abs(totalSpacerHeight - lastAppliedSpacerHeightRef.current) > 2.0) {
      lastAppliedSpacerHeightRef.current = totalSpacerHeight;
      setNavHeight(totalSpacerHeight);
    }
  }, [setNavHeight]);

  const handleContentHeightChange = useCallback(
    (height) => {
      if (height > 0) {
        heightRef.current.content = height;
      }
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
    lastAppliedContainerHeightRef.current = NAV_CARD_LAYOUT.baseHeight;
    lastAppliedSpacerHeightRef.current = NAV_CARD_LAYOUT.baseHeight + NAV_HEIGHT_BUFFER;
    setContainerHeight(NAV_CARD_LAYOUT.baseHeight);
    setNavHeight(NAV_CARD_LAYOUT.baseHeight + NAV_HEIGHT_BUFFER);
  }, [setNavHeight]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (compact) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      const compactHeight = NAV_CARD_LAYOUT.compactHeight;
      const compactSpacerHeight = compactHeight + NAV_HEIGHT_BUFFER;

      lastAppliedContainerHeightRef.current = compactHeight;
      lastAppliedSpacerHeightRef.current = compactSpacerHeight;

      setContainerHeight(compactHeight);
      setNavHeight(compactSpacerHeight);
      return;
    }

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
  }, [activeItemIsOverlay, activeItemLayoutKey]);

  return {
    containerHeight,
    handleContentHeightChange,
  };
}
