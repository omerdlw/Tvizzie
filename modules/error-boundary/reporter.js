'use client'

const MAX_CONTEXT_SIZE = 10
const MAX_SEEN_FINGERPRINTS = 100

function generateFingerprint(error, context = {}) {
  const parts = [
    context.componentStack?.split('\n')[0] || '',
    error?.message?.slice(0, 100) || 'no-message',
    error?.name || 'UnknownError',
    context.route || '',
  ]
  return parts.filter(Boolean).join('::')
}

function createErrorReport(error, options = {}) {
  const { context = {}, tags = {} } = options

  return {
    error: {
      message: error?.message || String(error),
      stack: error?.stack || null,
      name: error?.name || 'UnknownError',
    },

    fingerprint: generateFingerprint(error, context),
    timestamp: new Date().toISOString(),

    environment: {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      route:
        context.route ||
        (typeof window !== 'undefined' ? window.location.pathname : null),
      platform: typeof navigator !== 'undefined' ? navigator.platform : null,
      language: typeof navigator !== 'undefined' ? navigator.language : null,
      online: typeof navigator !== 'undefined' ? navigator.onLine : true,
      url: typeof window !== 'undefined' ? window.location.href : null,
      viewport:
        typeof window !== 'undefined'
          ? { width: window.innerWidth, height: window.innerHeight }
          : null,
    },

    componentStack: context.componentStack || null,
    componentName: context.name || null,
    variant: context.variant || null,
    context,
    tags,
  }
}

class ErrorReporter {
  constructor(options = {}) {
    this.deduplicateWindow = options.deduplicateWindow || 60000
    this.sampleRate = options.sampleRate ?? 1.0
    this.beforeSend = options.beforeSend || null
    this.seenFingerprints = new Set()
    this.enabled = options.enabled ?? true
    this.handlers = []
    this.context = {}
    this.tags = {}
  }

  addHandler(handler) {
    if (handler && typeof handler.handle === 'function') {
      this.handlers.push(handler)
    }
    return this
  }

  removeHandler(name) {
    this.handlers = this.handlers.filter((h) => h.name !== name)
    return this
  }

  setContext(key, value) {
    if (Object.keys(this.context).length < MAX_CONTEXT_SIZE) {
      this.context[key] = value
    }
    return this
  }

  setTag(key, value) {
    this.tags[key] = String(value)
    return this
  }

  captureError(error, additionalContext = {}) {
    if (!this.enabled) return
    if (Math.random() > this.sampleRate) return

    const mergedContext = { ...this.context, ...additionalContext }

    let report = createErrorReport(error, {
      tags: { ...this.tags },
      context: mergedContext,
    })

    if (this.seenFingerprints.has(report.fingerprint)) {
      return
    }
    if (this.seenFingerprints.size >= MAX_SEEN_FINGERPRINTS) {
      const firstKey = this.seenFingerprints.values().next().value
      this.seenFingerprints.delete(firstKey)
    }
    this.seenFingerprints.add(report.fingerprint)
    setTimeout(() => {
      this.seenFingerprints.delete(report.fingerprint)
    }, this.deduplicateWindow)

    if (this.beforeSend) {
      try {
        report = this.beforeSend(report)
        if (!report) return
      } catch {} // eslint-disable-line no-empty
    }

    this.handlers.forEach((handler) => {
      try {
        handler.handle(report)
      } catch {} // eslint-disable-line no-empty
    })

    return report
  }

  captureMessage(message, level = 'info', context = {}) {
    const pseudoError = new Error(message)
    pseudoError.name = 'Message'
    return this.captureError(pseudoError, { ...context, level })
  }
}

let reporterInstance = null

export function getErrorReporter(options = {}) {
  if (!reporterInstance) {
    reporterInstance = new ErrorReporter(options)
  }
  return reporterInstance
}
