'use client';

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
