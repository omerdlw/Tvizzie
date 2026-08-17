'use client';

import { usePathname } from 'next/navigation';
import { apiCache } from '@/modules/api';
import { ErrorBoundaryCore } from './core';

export { GlobalErrorListener } from './listener';
export { getErrorReporter } from './reporter';
export { createConsoleHandler, createSentryHandler } from './integrations';

const GLOBAL_ERROR_TITLE = 'Application Error';
const GLOBAL_ERROR_MESSAGE = 'Something went wrong. Please try again.';
const MODULE_ERROR_TITLE = 'Module Error';
const MODULE_ERROR_MESSAGE = 'This module encountered an unexpected error';
const COMPONENT_ERROR_MESSAGE = 'Component failed to load';

export function GlobalError({ children, onReset, fallback }) {
  const pathname = usePathname();

  const handleReset = () => {
    apiCache.clear();
    onReset?.();
  };

  return (
    <ErrorBoundaryCore
      title={GLOBAL_ERROR_TITLE}
      message={GLOBAL_ERROR_MESSAGE}
      resetKey={pathname}
      variant="full"
      fallback={fallback}
      onReset={handleReset}
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
