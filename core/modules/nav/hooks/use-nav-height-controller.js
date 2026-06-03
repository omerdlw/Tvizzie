'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { NAV_CARD_LAYOUT, NAV_HEIGHT_BUFFER } from '../item-model';
import { getContainerHeight, getDistanceToBottom, NAV_SPACER_BOTTOM_LOCK_DISTANCE } from '../geometry';

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function useNavHeightController({
  activeItemHasAction,
  activeItemIsOverlay,
  activeItemLayoutKey,
  compact,
  pathname,
  setNavHeight,
}) {
  const [containerHeight, setContainerHeight] = useState(NAV_CARD_LAYOUT.baseHeight);

  const heightRef = useRef({ action: 0, content: 0 });
  const rafRef = useRef(null);
  const compactRef = useRef(compact);
  const activeItemHasActionRef = useRef(activeItemHasAction);
  const previousPathRef = useRef(pathname);
  const previousActiveItemLayoutKeyRef = useRef(activeItemLayoutKey);

  compactRef.current = compact;
  activeItemHasActionRef.current = activeItemHasAction;

  const applyHeight = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;

      const { action, content } = heightRef.current;
      const height = getContainerHeight({
        actionHeight: action,
        activeItemHasAction: activeItemHasActionRef.current,
        cardContentHeight: content,
        compact: compactRef.current,
      });
      const isBottomLockedForSpacer = getDistanceToBottom() <= NAV_SPACER_BOTTOM_LOCK_DISTANCE;
      const spacerBaseHeight = isBottomLockedForSpacer ? NAV_CARD_LAYOUT.compactHeight : height;

      setContainerHeight(height);
      setNavHeight(spacerBaseHeight + NAV_HEIGHT_BUFFER);
    });
  }, [setNavHeight]);

  const handleActionHeightChange = useCallback(
    (height) => {
      heightRef.current.action = height;
      applyHeight();
    },
    [applyHeight]
  );

  const handleContentHeightChange = useCallback(
    (height) => {
      heightRef.current.content = height;
      applyHeight();
    },
    [applyHeight]
  );

  const resetHeights = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    heightRef.current = { action: 0, content: 0 };
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
    applyHeight();
  }, [activeItemHasAction, compact, applyHeight]);

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
    handleActionHeightChange,
    handleContentHeightChange,
  };
}
