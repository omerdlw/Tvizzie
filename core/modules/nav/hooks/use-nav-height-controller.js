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
    }

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;

      const { content } = heightRef.current;
      const height = getContainerHeight({
        cardContentHeight: content,
        compact: compactRef.current,
      });
      const isBottomLockedForSpacer = getDistanceToBottom() <= NAV_SPACER_BOTTOM_LOCK_DISTANCE;
      const spacerBaseHeight = isBottomLockedForSpacer ? NAV_CARD_LAYOUT.compactHeight : height;

      setContainerHeight(height);
      setNavHeight(spacerBaseHeight + NAV_HEIGHT_BUFFER);
    });
  }, [setNavHeight]);

  const handleContentHeightChange = useCallback(
    (height) => {
      // Ignore content height changes while compact, since the height is
      // snapped directly and should not be influenced by the action
      // component's exit animation feeding intermediate values.
      if (compactRef.current) return;

      heightRef.current.content = height;
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

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (compact) {
      // When entering compact mode, snap immediately to compact height.
      // This avoids the slow height animation caused by the action component's
      // exit animation feeding intermediate measured values through the spring.
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      const compactHeight = NAV_CARD_LAYOUT.compactHeight;
      heightRef.current.content = 0;
      setContainerHeight(compactHeight);
      setNavHeight(compactHeight + NAV_HEIGHT_BUFFER);
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
    applyHeight();
  }, [activeItemIsOverlay, activeItemLayoutKey, applyHeight]);

  return {
    containerHeight,
    handleContentHeightChange,
  };
}
