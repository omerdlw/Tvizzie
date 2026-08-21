'use client';

import { useCallback, useEffect, useRef } from 'react';
import { globalEvents, EVENT_TYPES } from '@/shared/events';
import { getErrorReporter } from './reporter';

const CONFIG = Object.freeze({
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

function shouldIgnore(error) {
  const msg = getErrorMessage(error);

  if (typeof error?.isNotFound === 'function' && error.isNotFound()) {
    return true;
  }

  if (/HTTP\s*404/.test(msg)) return true;

  return CONFIG.ignored.some((pattern) => pattern.test(msg));
}

export function GlobalErrorListener() {
  const lastError = useRef(0);
  const count = useRef(0);
  const shown = useRef(new Set());

  const handleError = useCallback((error, source = 'runtime') => {
    if (!error || shouldIgnore(error)) return;
    const message = getErrorMessage(error);

    const now = Date.now();

    if (now - lastError.current < CONFIG.throttle) return;
    if (count.current >= CONFIG.maxErrors) return;

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
