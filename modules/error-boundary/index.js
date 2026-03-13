'use client'

import React from 'react'

import { usePathname } from 'next/navigation'

import { apiCache } from '@/modules/api'

import { ErrorBoundaryCore } from './core'

export { GlobalErrorListener } from './listener'

export { getErrorReporter } from './reporter'

export { createConsoleHandler, createSentryHandler } from './integrations'

export function GlobalError({ children, onReset }) {
  const pathname = usePathname()

  return (
    <ErrorBoundaryCore
      message="Something went wrong Please try refreshing the page or try again"
      title="Application Error"
      resetKey={pathname}
      variant="full"
      onReset={() => {
        apiCache.clear()
        onReset?.()
      }}
    >
      {children}
    </ErrorBoundaryCore>
  )
}

export function ModuleError({ children, onReset, name }) {
  return (
    <ErrorBoundaryCore
      message="This module encountered an unexpected error"
      title={name ? `${name} Error` : 'Module Error'}
      onReset={onReset}
      variant="module"
    >
      {children}
    </ErrorBoundaryCore>
  )
}

export function ComponentError({ children, message, onReset }) {
  return (
    <ErrorBoundaryCore
      message={message || 'Component failed to load'}
      onReset={onReset}
      variant="inline"
    >
      {children}
    </ErrorBoundaryCore>
  )
}
