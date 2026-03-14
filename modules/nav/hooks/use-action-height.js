'use client'

import { useElementHeight } from './use-element-height'

export const useActionHeight = (
  onActionHeightChange,
  actionContainerRef,
  ActionComponent,
  isTop
) => {
  useElementHeight(
    onActionHeightChange,
    actionContainerRef,
    isTop && Boolean(ActionComponent),
    ActionComponent
  )
}
