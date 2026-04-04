'use client';

import React from 'react';

import { usePathname } from 'next/navigation';

import { apiCache } from '@/core/modules/api';

import { ErrorBoundaryCore } from './core';

export { GlobalErrorListener } from './listener';
export { getErrorReporter } from './reporter';
export { createConsoleHandler, createSentryHandler } from './integrations';

export function GlobalError({ children, onReset }) {
  const pathname = usePathname();

  const handleReset = () => {
    apiCache.clear();
    onReset?.();
  };

  return (
    <ErrorBoundaryCore
      title="Application Error"
      message="Something went wrong Please try again"
      resetKey={pathname}
      variant="full"
      onReset={handleReset}
    >
      {children}
    </ErrorBoundaryCore>
  );
}

export function ModuleError({ children, name, onReset }) {
  return (
    <ErrorBoundaryCore
      title={name ? `${name} Error` : 'Module Error'}
      message="This module encountered an unexpected error"
      variant="module"
      onReset={onReset}
    >
      {children}
    </ErrorBoundaryCore>
  );
}

export function ComponentError({ children, message, onReset }) {
  return (
    <ErrorBoundaryCore message={message || 'Component failed to load'} variant="inline" onReset={onReset}>
      {children}
    </ErrorBoundaryCore>
  );
}
