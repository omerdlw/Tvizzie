'use client'

import { useCallback, useEffect, useRef } from 'react'

import { globalEvents, EVENT_TYPES } from '@/core/constants/events'

import { getErrorReporter } from './reporter'

const CONFIG = {
  maxErrors: 10,
  throttle: 2000,
  ignored: [
    /ResizeObserver loop/i,
    /Network request failed/i,
    /Loading chunk/i,
  ],
}

function shouldIgnore(error) {
  const msg = error?.message || error?.toString() || ''

  if (error?.isNotFound?.()) return true

  if (/HTTP\s*404/.test(msg)) return true

  return CONFIG.ignored.some((pattern) => pattern.test(msg))
}

export function GlobalErrorListener() {
  const lastError = useRef(0)
  const count = useRef(0)
  const shown = useRef(new Set())

  const handleError = useCallback((error, source = 'runtime') => {
    if (!error || shouldIgnore(error)) return

    const now = Date.now()

    if (now - lastError.current < CONFIG.throttle) return
    if (count.current >= CONFIG.maxErrors) return

    const key = error.message || String(error)

    if (shown.current.has(key)) return

    shown.current.add(key)

    lastError.current = now
    count.current += 1

    const reporter = getErrorReporter()

    if (reporter.handlers.length) {
      reporter.captureError(error, { source, globalListener: true })
    }

    globalEvents.emit(EVENT_TYPES.APP_ERROR, {
      message: error.message || 'Unexpected error',
      error,
    })

    if (process.env.NODE_ENV === 'development') {
      console.error(`[GlobalError][${source}]`, error)
    }
  }, [])

  useEffect(() => {
    const onError = (event) => {
      event.preventDefault()
      handleError(event.error || event.message, 'window.onerror')
    }

    const onRejection = (event) => {
      event.preventDefault()
      handleError(event.reason, 'unhandledrejection')
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)

    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [handleError])

  return null
}
