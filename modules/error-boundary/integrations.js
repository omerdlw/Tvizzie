'use client'

export function createConsoleHandler(options = {}) {
  const { level = 'error', expanded = false } = options

  return {
    name: 'console',
    handle: (report) => {
      const logMethod = console[level] || console.error

      if (expanded) {
        console.group(`🔴 [ErrorReporter] ${report.error.name}`)
        console.log('Fingerprint:', report.fingerprint)
        console.log('Message:', report.error.message)
        console.log('Timestamp:', report.timestamp)
        console.log('Route:', report.environment.route)
        if (report.user) console.log('User:', report.user)
        if (report.componentStack) {
          console.log('Component Stack:', report.componentStack)
        }
        if (report.error.stack) {
          console.log('Stack Trace:', report.error.stack)
        }
        console.groupEnd()
      } else {
        logMethod('[ErrorReporter]', {
          fingerprint: report.fingerprint,
          route: report.environment.route,
          error: report.error.message,
        })
      }
    },
  }
}

export function createSentryHandler(Sentry) {
  if (!Sentry) {
    console.warn('[ErrorReporter] Sentry SDK not provided')
    return createConsoleHandler()
  }

  return {
    name: 'sentry',
    handle: (report) => {
      Sentry.withScope((scope) => {
        scope.setFingerprint([report.fingerprint])

        if (report.user) {
          scope.setUser(report.user)
        }

        if (report.tags) {
          Object.entries(report.tags).forEach(([key, value]) => {
            scope.setTag(key, value)
          })
        }

        scope.setContext('environment', report.environment)

        if (report.context) {
          scope.setContext('custom', report.context)
        }

        if (report.componentStack) {
          scope.setExtra('componentStack', report.componentStack)
        }

        const error = new Error(report.error.message)
        error.name = report.error.name
        if (report.error.stack) {
          error.stack = report.error.stack
        }

        Sentry.captureException(error)
      })
    },
  }
}

export function createWebhookHandler(url, options = {}) {
  const {
    headers = { 'Content-Type': 'application/json' },
    transform = (report) => report,
    timeout = 5000,
    method = 'POST',
  } = options

  return {
    name: 'webhook',
    handle: async (report) => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        const payload = transform(report)

        await fetch(url, {
          body: JSON.stringify(payload),
          signal: controller.signal,
          headers,
          method,
        })

        clearTimeout(timeoutId)
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[ErrorReporter] Webhook failed:', error.message)
        }
      }
    },
  }
}

export function createLocalStorageHandler(options = {}) {
  const { key = 'error_reports', maxErrors = 50 } = options

  return {
    name: 'localStorage',
    handle: (report) => {
      if (typeof window === 'undefined') return

      try {
        const stored = JSON.parse(localStorage.getItem(key) || '[]')
        stored.push({
          fingerprint: report.fingerprint,
          timestamp: report.timestamp,
          route: report.environment.route,
          error: report.error.message,
        })

        const trimmed = stored.slice(-maxErrors)
        localStorage.setItem(key, JSON.stringify(trimmed))
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            '[ErrorReporter] localStorage write failed:',
            error.message
          )
        }
      }
    },
  }
}

export function createBatchHandler(sendBatch, options = {}) {
  const { flushInterval = 30000, batchSize = 10 } = options

  let batch = []
  let flushTimer = null

  const flush = () => {
    if (batch.length === 0) return
    const toSend = [...batch]
    batch = []
    try {
      sendBatch(toSend)
    } catch (error) {
      console.warn('[ErrorReporter] Batch send failed:', error.message)
    }
  }

  if (typeof window !== 'undefined') {
    flushTimer = setInterval(flush, flushInterval)
    window.addEventListener('beforeunload', flush)
  }

  return {
    name: 'batch',
    handle: (report) => {
      batch.push(report)
      if (batch.length >= batchSize) {
        flush()
      }
    },
    flush,
    destroy: () => {
      if (flushTimer) clearInterval(flushTimer)
      flush()
    },
  }
}
