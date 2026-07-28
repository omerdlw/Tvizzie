'use client';

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
