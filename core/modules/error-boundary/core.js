'use client';

import React from 'react';

import { globalEvents, EVENT_TYPES } from '@/core/constants/events';

import { getErrorReporter } from './reporter';

function isDevelopment() {
  return process.env.NODE_ENV === 'development';
}

function getRuntimePath() {
  return typeof window !== 'undefined' ? window.location.pathname : null;
}

function getUserAgent() {
  return typeof navigator !== 'undefined' ? navigator.userAgent : null;
}

function createErrorContext({ errorInfo, name, title, variant }) {
  return {
    componentStack: errorInfo?.componentStack,
    route: getRuntimePath(),
    userAgent: getUserAgent(),
    timestamp: new Date().toISOString(),
    name: name || title,
    variant,
    source: 'ErrorBoundary',
  };
}

export class ErrorBoundaryCore extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      lastResetKey: props.resetKey,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  static getDerivedStateFromProps(props, state) {
    if (props.resetKey !== state.lastResetKey) {
      return {
        lastResetKey: props.resetKey,
        hasError: false,
        error: null,
        errorInfo: null,
      };
    }

    return null;
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    const { message, name, onError, silent, title, variant } = this.props;
    const context = createErrorContext({ errorInfo, name, title, variant });

    onError?.(error, errorInfo, context);

    if (!silent) {
      globalEvents.emit(EVENT_TYPES.APP_ERROR, {
        message: message || error?.message || 'An unexpected error occurred',
        error,
        errorInfo,
        resetError: this.resetError,
      });
    }

    const reporter = getErrorReporter();

    if (reporter.handlers.length) {
      reporter.captureError(error, context);
    }

    if (isDevelopment()) {
      console.error('[ErrorBoundary]', error, context);
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      const { fallback } = this.props;

      if (fallback) {
        if (typeof fallback === 'function') {
          return fallback({
            resetError: this.resetError,
            error: this.state.error,
          });
        }

        return fallback;
      }

      return (
        <div className="center h-screen w-screen bg-[#fecaca] text-[#7f1d1d]">
          <h1 className="text-9xl font-extrabold">ERROR</h1>
        </div>
      );
    }

    return this.props.children;
  }
}
