'use client'

import { useEffect, useState } from 'react'

const DEFAULT_DELAY_MS = 1600

export function useDelayedReady(delayMs = DEFAULT_DELAY_MS) {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let frameId = 0

    const timeoutId = window.setTimeout(() => {
      frameId = window.requestAnimationFrame(() => {
        setIsReady(true)
      })
    }, delayMs)

    return () => {
      window.clearTimeout(timeoutId)
      window.cancelAnimationFrame(frameId)
    }
  }, [delayMs])

  return isReady
}
