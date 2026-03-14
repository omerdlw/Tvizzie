'use client'

import { useEffect, useRef } from 'react'

export const useElementHeight = (
  onHeightChange,
  elementRef,
  shouldMeasure,
  dependencyKey = null
) => {
  const lastHeightRef = useRef(0)

  useEffect(() => {
    if (!onHeightChange) return

    if (!shouldMeasure) {
      if (lastHeightRef.current !== 0) {
        lastHeightRef.current = 0
        onHeightChange(0)
      }
      return
    }

    const element = elementRef.current
    if (!element) return

    const updateHeight = (nextHeight) => {
      if (Math.abs(nextHeight - lastHeightRef.current) <= 0.5) return
      lastHeightRef.current = nextHeight
      onHeightChange(nextHeight)
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const boxSize = Array.isArray(entry.borderBoxSize)
          ? entry.borderBoxSize[0]?.blockSize
          : entry.borderBoxSize?.blockSize

        updateHeight(boxSize || element.offsetHeight || 0)
      }
    })

    observer.observe(element)
    updateHeight(element.offsetHeight || 0)

    return () => {
      observer.disconnect()
    }
  }, [dependencyKey, onHeightChange, elementRef, shouldMeasure])
}
