'use client'

import { useElementHeight } from './use-element-height'

export function useActionHeight(
  onHeightChange,
  containerRef,
  actionNode,
  isTopItem
) {
  const shouldMeasure = isTopItem && Boolean(actionNode)

  useElementHeight(onHeightChange, containerRef, shouldMeasure, actionNode)
}
