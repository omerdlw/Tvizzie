'use client'

import { useCallback, useEffect, useRef } from 'react'

import { EVENT_TYPES, globalEvents } from '@/lib/events'

import { getErrorReporter } from './reporter'

const ERROR_CONFIG = {
  maxErrorsPerSession: 10,
  throttleMs: 2000,
  ignoredPatterns: [
    /ResizeObserver loop/i,
    /Network request failed/i,
    /Loading chunk/i,
  ],
}

function formatErrorMessage(error) {
  if (!error) return 'An unexpected error occurred.'

  if (typeof error === 'string') return error

  if (error.message) {
    const msg = error.message
    if (msg.length > 100) return msg.substring(0, 100) + '...'
    return msg
  }

  return 'An unexpected error occurred.'
}

function shouldIgnoreError(error) {
  const message = error?.message || error?.toString() || ''

  if (error?.isNotFound?.()) return true

  if (/HTTP\s*404/.test(message)) return true

  return ERROR_CONFIG.ignoredPatterns.some((pattern) => pattern.test(message))
}

export function GlobalErrorListener() {
  const lastErrorTimeRef = useRef(0)
  const shownErrorsRef = useRef(new Set())
  const errorCountRef = useRef(0)

  const handleError = useCallback((error, source = 'runtime') => {
    if (!error || shouldIgnoreError(error)) return

    const now = Date.now()
    if (now - lastErrorTimeRef.current < ERROR_CONFIG.throttleMs) return

    if (errorCountRef.current >= ERROR_CONFIG.maxErrorsPerSession) return

    const errorKey = `${error.message || error}`
    if (shownErrorsRef.current.has(errorKey)) return

    lastErrorTimeRef.current = now
    errorCountRef.current += 1
    shownErrorsRef.current.add(errorKey)

    const message = formatErrorMessage(error)

    const reporter = getErrorReporter()
    if (reporter.handlers.length > 0) {
      reporter.captureError(error, { source, globalListener: true })
    }

    globalEvents.emit(EVENT_TYPES.APP_ERROR, {
      message,
      error,
    })

    if (process.env.NODE_ENV === 'development') {
      console.error(`[GlobalErrorListener][${source}]`, error)
    }
  }, [])

  useEffect(() => {
    const handleWindowError = (event) => {
      event.preventDefault()
      handleError(event.error || event.message, 'window.onerror')
    }

    const handleUnhandledRejection = (event) => {
      event.preventDefault()
      handleError(event.reason, 'unhandledrejection')
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleWindowError)

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleWindowError)
    }
  }, [handleError])

  return null
}
