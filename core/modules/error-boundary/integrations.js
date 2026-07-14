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
  if (!Sentry) {
    console.warn('[ErrorReporter] Missing Sentry SDK');
    return createConsoleHandler();
  }

  return {
    name: 'sentry',

    handle(report) {
      Sentry.withScope((scope) => {
        scope.setFingerprint([report.fingerprint]);

        if (report.user) scope.setUser(report.user);

        if (report.tags) {
          Object.entries(report.tags).forEach(([k, v]) => scope.setTag(k, v));
        }

        scope.setContext('environment', report.environment);

        if (report.context) {
          scope.setContext('custom', report.context);
        }

        if (report.componentStack) {
          scope.setExtra('componentStack', report.componentStack);
        }

        const error = new Error(report.error.message);
        error.name = report.error.name;
        error.stack = report.error.stack;

        Sentry.captureException(error);
      });
    },
  };
}
