'use client'

import { useEffect, useSyncExternalStore } from 'react'

import { cn } from '@/core/utils'

let activeFullscreenStateCount = 0

const listeners = new Set()

function emitChange() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return activeFullscreenStateCount > 0
}

function updateActiveCount(delta) {
  activeFullscreenStateCount = Math.max(0, activeFullscreenStateCount + delta)
  emitChange()
}

export function useIsFullscreenStateActive() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}

export function FullscreenState({
  children,
  className,
  contentClassName,
  lockScroll = true,
}) {
  useEffect(() => {
    updateActiveCount(1)

    if (!lockScroll || typeof document === 'undefined') {
      return () => {
        updateActiveCount(-1)
      }
    }

    const { body, documentElement } = document
    const previousBodyOverflow = body.style.overflow
    const previousHtmlOverflow = documentElement.style.overflow
    const previousBodyOverscrollBehavior = body.style.overscrollBehavior
    const previousHtmlOverscrollBehavior = documentElement.style.overscrollBehavior
    const previousFullscreenState = documentElement.dataset.fullscreenState

    body.style.overflow = 'hidden'
    documentElement.style.overflow = 'hidden'
    body.style.overscrollBehavior = 'none'
    documentElement.style.overscrollBehavior = 'none'
    documentElement.dataset.fullscreenState = 'true'

    return () => {
      body.style.overflow = previousBodyOverflow
      documentElement.style.overflow = previousHtmlOverflow
      body.style.overscrollBehavior = previousBodyOverscrollBehavior
      documentElement.style.overscrollBehavior = previousHtmlOverscrollBehavior

      if (previousFullscreenState) {
        documentElement.dataset.fullscreenState = previousFullscreenState
      } else {
        delete documentElement.dataset.fullscreenState
      }

      updateActiveCount(-1)
    }
  }, [lockScroll])

  return (
    <div
      className={cn(
        'fixed inset-0 h-screen w-screen overflow-hidden ',
        className
      )}
    >
      <div className={cn('center h-full w-full p-6', contentClassName)}>
        {children}
      </div>
    </div>
  )
}

export default FullscreenState
