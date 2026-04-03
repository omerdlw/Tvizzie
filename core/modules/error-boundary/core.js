'use client'

import React from 'react'

import { globalEvents, EVENT_TYPES } from '@/core/constants/events'

import { getErrorReporter } from './reporter'

export class ErrorBoundaryCore extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      lastResetKey: props.resetKey,
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  static getDerivedStateFromProps(props, state) {
    if (props.resetKey !== state.lastResetKey) {
      return {
        lastResetKey: props.resetKey,
        hasError: false,
        error: null,
        errorInfo: null,
      }
    }

    return null
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })

    const context = {
      componentStack: errorInfo?.componentStack,
      route: typeof window !== 'undefined' ? window.location.pathname : null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      timestamp: new Date().toISOString(),
      name: this.props.name || this.props.title,
      variant: this.props.variant,
      source: 'ErrorBoundary',
    }

    this.props.onError?.(error, errorInfo, context)

    if (!this.props.silent) {
      globalEvents.emit(EVENT_TYPES.APP_ERROR, {
        message:
          this.props.message ||
          error?.message ||
          'An unexpected error occurred',
        error,
        errorInfo,
        resetError: this.resetError,
      })
    }

    const reporter = getErrorReporter()

    if (reporter.handlers.length) {
      reporter.captureError(error, context)
    }

    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorBoundary]', error, context)
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })

    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      const { fallback } = this.props

      if (fallback) {
        if (typeof fallback === 'function') {
          return fallback({
            resetError: this.resetError,
            error: this.state.error,
          })
        }

        return fallback
      }

      return (
        <div className="center bg-error h-screen w-screen">
          <h1 className="text-9xl font-white">ERROR</h1>
        </div>
      )
    }

    return this.props.children
  }
}
