'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { globalEvents, EVENT_TYPES } from '@/shared';
import { Button } from '@/ui/primitives';

const MAX_CONTEXT = 10;
const MAX_FINGERPRINTS = 100;

function getBrowserEnvironment(route) {
  const hasWindow = typeof window !== 'undefined';
  const hasNavigator = typeof navigator !== 'undefined';

  return {
    route: route || (hasWindow ? window.location.pathname : null),
    userAgent: hasNavigator ? navigator.userAgent : null,
    platform: hasNavigator ? navigator.platform : null,
    language: hasNavigator ? navigator.language : null,
    online: hasNavigator ? navigator.onLine : true,
    url: hasWindow ? window.location.href : null,
  };
}

function fingerprint(error, ctx = {}) {
  const stackTop = ctx.componentStack?.split('\n').filter(Boolean)[0] || '';
  const errorMessage = error?.message?.slice(0, 100) || String(error || '').slice(0, 100);
  const errorName = error?.name || 'UnknownError';
  const route = ctx.route || '';

  return [stackTop, errorMessage, errorName, route].filter(Boolean).join('::');
}

function createReport(error, { context = {}, tags = {} } = {}) {
  return {
    error: {
      message: error?.message || String(error),
      stack: error?.stack || null,
      name: error?.name || 'UnknownError',
    },
    fingerprint: fingerprint(error, context),
    timestamp: new Date().toISOString(),
    environment: getBrowserEnvironment(context.route),
    componentStack: context.componentStack || null,
    context,
    tags,
  };
}

class ErrorReporter {
  constructor(options = {}) {
    this.handlers = [];
    this.context = {};
    this.tags = {};
    this.enabled = options.enabled ?? true;
    this.sampleRate = options.sampleRate ?? 1;
    this.beforeSend = options.beforeSend || null;
    this.dedupeWindow = options.deduplicateWindow || 60000;
    this.seen = new Set();
  }

  addHandler(handler) {
    if (handler?.handle && typeof handler.handle === 'function') {
      this.handlers.push(handler);
    }
    return this;
  }

  removeHandler(name) {
    this.handlers = this.handlers.filter((h) => h.name !== name);
    return this;
  }

  setContext(key, value) {
    if (Object.keys(this.context).length < MAX_CONTEXT) {
      this.context[key] = value;
    }
    return this;
  }

  setTag(key, value) {
    this.tags[key] = String(value);
    return this;
  }

  captureError(error, extraContext = {}) {
    if (!this.enabled) return;
    if (Math.random() > this.sampleRate) return;

    const context = { ...this.context, ...extraContext };

    let report = createReport(error, {
      context,
      tags: { ...this.tags },
    });

    if (this.seen.has(report.fingerprint)) return;

    if (this.seen.size >= MAX_FINGERPRINTS) {
      const first = this.seen.values().next().value;
      if (first) {
        this.seen.delete(first);
      }
    }

    this.seen.add(report.fingerprint);

    setTimeout(() => {
      this.seen.delete(report.fingerprint);
    }, this.dedupeWindow);

    if (this.beforeSend) {
      try {
        report = this.beforeSend(report);
        if (!report) return;
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[ErrorReporter] beforeSend callback failed:', err);
        }
      }
    }

    this.handlers.forEach((h) => {
      try {
        h.handle(report);
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[ErrorReporter] Handler "${h.name}" failed:`, err);
        }
      }
    });

    return report;
  }

  captureMessage(message, level = 'info', context = {}) {
    const error = new Error(message);
    error.name = 'Message';
    return this.captureError(error, { ...context, level });
  }
}

let instance = null;

export function getErrorReporter(options = {}) {
  if (!instance) {
    instance = new ErrorReporter(options);
  }
  return instance;
}

export function createConsoleHandler({ level = 'error', expanded = false } = {}) {
  const log = console[level] || console.error;

  return {
    name: 'console',

    handle(report) {
      if (expanded) {
        console.group(`🔴 ErrorReporter: ${report.error.name}`);
        console.log(report);
        console.groupEnd();
        return;
      }

      log('[ErrorReporter]', {
        fingerprint: report.fingerprint,
        route: report.environment.route,
        error: report.error.message,
      });
    },
  };
}

export function createSentryHandler(Sentry) {
  if (!Sentry || typeof Sentry.captureException !== 'function') {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[ErrorReporter] Missing or invalid Sentry SDK instance');
    }
    return createConsoleHandler();
  }

  return {
    name: 'sentry',

    handle(report) {
      Sentry.withScope((scope) => {
        if (report.fingerprint) {
          scope.setFingerprint([report.fingerprint]);
        }

        if (report.user) {
          scope.setUser(report.user);
        }

        if (report.tags && typeof report.tags === 'object') {
          Object.entries(report.tags).forEach(([key, value]) => {
            scope.setTag(key, String(value));
          });
        }

        if (report.environment) {
          scope.setContext('environment', report.environment);
        }

        if (report.context) {
          scope.setContext('custom', report.context);
        }

        if (report.componentStack) {
          scope.setExtra('componentStack', report.componentStack);
        }

        const error = new Error(report.error.message);
        error.name = report.error.name || 'Error';
        error.stack = report.error.stack || undefined;

        Sentry.captureException(error);
      });
    },
  };
}

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
    componentStack: errorInfo?.componentStack || null,
    route: getRuntimePath(),
    userAgent: getUserAgent(),
    timestamp: new Date().toISOString(),
    name: name || title || 'ErrorBoundary',
    variant: variant || 'default',
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
        <div className="bg-error/5 ring-error/10 flex min-h-[300px] w-full flex-col items-center justify-center ring-1 ring-inset p-6 text-center">
          <div className="bg-error/10 text-error mb-4 flex size-12 items-center justify-center text-xl font-bold">
            !
          </div>
          <h3 className="text-foreground mb-1 text-lg font-semibold">
            {this.props.title || 'An error occurred'}
          </h3>
          <p className="text-muted-foreground mb-4 max-w-md text-sm">
            {this.props.message ||
              this.state.error?.message ||
              'Something went wrong while loading this component.'}
          </p>
          <Button
            type="button"
            onClick={this.resetError}
            className="bg-error hover:bg-error/90 px-4 py-2 text-xs font-medium text-black transition-all duration-300 ease-in-out"
          >
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

const ERROR_LISTENER_CONFIG = Object.freeze({
  maxErrors: 10,
  throttle: 2000,
  ignored: Object.freeze([
    /ResizeObserver loop/i,
    /Network request failed/i,
    /Loading chunk/i,
    /Unexpected end of input/i,
    /Failed to fetch/i,
    /Script error/i,
  ]),
});

function getErrorMessage(error) {
  if (typeof error === 'string') return error.trim();
  return String(error?.message || error?.toString?.() || '').trim();
}

function shouldIgnoreError(error) {
  const msg = getErrorMessage(error);

  if (typeof error?.isNotFound === 'function' && error.isNotFound()) {
    return true;
  }

  if (/HTTP\s*404/.test(msg)) return true;

  return ERROR_LISTENER_CONFIG.ignored.some((pattern) => pattern.test(msg));
}

export function GlobalErrorListener() {
  const lastError = useRef(0);
  const count = useRef(0);
  const shown = useRef(new Set());

  const handleError = useCallback((error, source = 'runtime') => {
    if (!error || shouldIgnoreError(error)) return;
    const message = getErrorMessage(error);

    const now = Date.now();

    if (now - lastError.current < ERROR_LISTENER_CONFIG.throttle) return;
    if (count.current >= ERROR_LISTENER_CONFIG.maxErrors) return;

    const key = message || String(error);

    if (shown.current.has(key)) return;

    shown.current.add(key);
    lastError.current = now;
    count.current += 1;

    const reporter = getErrorReporter();

    if (reporter.handlers.length) {
      reporter.captureError(error, { source, globalListener: true });
    }

    globalEvents.emit(EVENT_TYPES.APP_ERROR, {
      message: message || 'Unexpected error occurred',
      error,
    });

    if (process.env.NODE_ENV === 'development') {
      console.error(`[GlobalError][${source}]`, error);
    }
  }, []);

  useEffect(() => {
    const onError = (event) => {
      handleError(event.error || event.message, 'window.onerror');
    };

    const onRejection = (event) => {
      handleError(event.reason, 'unhandledrejection');
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, [handleError]);

  return null;
}

const GLOBAL_ERROR_TITLE = 'Application Error';
const GLOBAL_ERROR_MESSAGE = 'Something went wrong. Please try again.';
const MODULE_ERROR_TITLE = 'Module Error';
const MODULE_ERROR_MESSAGE = 'This module encountered an unexpected error';
const COMPONENT_ERROR_MESSAGE = 'Component failed to load';

export function GlobalError({ children, onReset, fallback }) {
  const pathname = usePathname();

  return (
    <ErrorBoundaryCore
      title={GLOBAL_ERROR_TITLE}
      message={GLOBAL_ERROR_MESSAGE}
      resetKey={pathname}
      variant="full"
      fallback={fallback}
      onReset={onReset}
    >
      {children}
    </ErrorBoundaryCore>
  );
}

export function ModuleError({ children, name, onReset, fallback }) {
  return (
    <ErrorBoundaryCore
      title={name ? `${name} Error` : MODULE_ERROR_TITLE}
      message={MODULE_ERROR_MESSAGE}
      variant="module"
      fallback={fallback}
      onReset={onReset}
    >
      {children}
    </ErrorBoundaryCore>
  );
}

export function ComponentError({ children, message, onReset, fallback }) {
  return (
    <ErrorBoundaryCore
      message={message || COMPONENT_ERROR_MESSAGE}
      variant="inline"
      fallback={fallback}
      onReset={onReset}
    >
      {children}
    </ErrorBoundaryCore>
  );
}
