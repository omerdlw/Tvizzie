'use client';

import { useEffect } from 'react';

import { createConsoleHandler, createSentryHandler, getErrorReporter } from '@/core/modules/error-boundary';

function resolveSentryGlobal() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.Sentry || null;
}

export default function ObservabilityBootstrap() {
  useEffect(() => {
    const reporter = getErrorReporter({
      sampleRate: Number(process.env.NEXT_PUBLIC_ERROR_SAMPLE_RATE || 1),
    });

    if (!reporter.handlers.length) {
      reporter.addHandler(
        createConsoleHandler({
          level: 'error',
        })
      );

      const sentryGlobal = resolveSentryGlobal();

      if (sentryGlobal) {
        reporter.addHandler(createSentryHandler(sentryGlobal));
      }
    }

    reporter.setTag('runtime', 'web');
    reporter.setTag('transport', process.env.NEXT_PUBLIC_LIVE_TRANSPORT_MODE || process.env.REALTIME_MODE || 'sse');
  }, []);

  return null;
}
