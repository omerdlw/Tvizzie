'use client'

import { useEffect, useRef } from 'react'

export const useActionHeight = (
  onActionHeightChange,
  actionContainerRef,
  ActionComponent,
  isTop
) => {
  const lastHeightRef = useRef(0)

  useEffect(() => {
    if (!isTop || !onActionHeightChange) return
    if (!ActionComponent) {
      if (lastHeightRef.current !== 0) {
        lastHeightRef.current = 0
        onActionHeightChange(0)
      }
      return
    }
    const element = actionContainerRef.current
    if (!element) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const boxSize = Array.isArray(entry.borderBoxSize)
          ? entry.borderBoxSize[0]?.blockSize
          : entry.borderBoxSize?.blockSize

        const newHeight = boxSize || element.offsetHeight
        if (Math.abs(newHeight - lastHeightRef.current) > 0.5) {
          lastHeightRef.current = newHeight
          onActionHeightChange(newHeight)
        }
      }
    })

    observer.observe(element)

    const currentHeight = element.offsetHeight
    if (
      currentHeight > 0 &&
      Math.abs(currentHeight - lastHeightRef.current) > 0.5
    ) {
      lastHeightRef.current = currentHeight
      onActionHeightChange(currentHeight)
    }

    return () => {
      observer.disconnect()
    }
  }, [isTop, ActionComponent, onActionHeightChange, actionContainerRef])
}
