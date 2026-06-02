'use client';

import { useCallback } from 'react';

import { useElementHeight } from './use-element-height';

function parsePixelValue(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getActionMargins(containerRef) {
  if (typeof window === 'undefined') {
    return 0;
  }

  const container = containerRef?.current;
  const actionRoot = container?.firstElementChild;

  if (!actionRoot) {
    return 0;
  }

  const computedStyle = window.getComputedStyle(actionRoot);

  return parsePixelValue(computedStyle.marginTop) + parsePixelValue(computedStyle.marginBottom);
}

export function useActionHeight(onHeightChange, containerRef, actionNode, isTopItem, dependencyKey = actionNode) {
  const handleHeightChange = useCallback(
    (contentHeight) => {
      if (!onHeightChange) {
        return;
      }

      const margins = Boolean(actionNode) ? getActionMargins(containerRef) : 0;
      onHeightChange(contentHeight > 0 ? contentHeight + margins : 0);
    },
    [containerRef, onHeightChange, actionNode]
  );

  const shouldMeasure = isTopItem && Boolean(actionNode);

  useElementHeight(handleHeightChange, containerRef, shouldMeasure, dependencyKey);
}
