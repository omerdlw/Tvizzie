const STORE_KEY = '__tvizzie_auth_sliding_window_rate_limit_store__'

class SlidingWindowRateLimitError extends Error {
  constructor({ message, retryAfterMs, dimension, key }) {
    super(message || 'Too many requests. Please try again later')
    this.name = 'SlidingWindowRateLimitError'
    this.code = 'RATE_LIMIT_EXCEEDED'
    this.status = 429
    this.retryAfterMs = Math.max(1000, Number(retryAfterMs) || 1000)
    this.retryAfterSeconds = Math.ceil(this.retryAfterMs / 1000)
    this.dimension = dimension || null
    this.key = key || null
  }
}

function normalizeValue(value) {
  return String(value || '').trim().toLowerCase()
}

function getStore() {
  if (!globalThis[STORE_KEY]) {
    globalThis[STORE_KEY] = new Map()
  }

  return globalThis[STORE_KEY]
}

function pruneEntries(entries = [], now, windowMs) {
  return entries.filter((timestamp) => now - timestamp < windowMs)
}

function buildBucketKey(namespace, dimension, value) {
  return `${namespace}:${dimension}:${value}`
}

function toDimensions(input = []) {
  if (!Array.isArray(input)) {
    return []
  }

  return input
    .map((dimension) => ({
      id: normalizeValue(dimension?.id),
      limit: Number(dimension?.limit) || 0,
      value: normalizeValue(dimension?.value),
    }))
    .filter((dimension) => Boolean(dimension.id && dimension.value && dimension.limit > 0))
}

export function isSlidingWindowRateLimitError(error) {
  return error?.code === 'RATE_LIMIT_EXCEEDED'
}

export function enforceSlidingWindowRateLimit({
  namespace,
  windowMs = 15 * 60 * 1000,
  dimensions = [],
  message = 'Too many requests. Please try again later',
}) {
  const normalizedNamespace = normalizeValue(namespace)

  if (!normalizedNamespace) {
    throw new Error('Rate limit namespace is required')
  }

  const normalizedWindowMs = Math.max(1000, Number(windowMs) || 1000)
  const normalizedDimensions = toDimensions(dimensions)

  if (!normalizedDimensions.length) {
    return
  }

  const now = Date.now()
  const store = getStore()
  const pendingUpdates = []

  for (const dimension of normalizedDimensions) {
    const bucketKey = buildBucketKey(
      normalizedNamespace,
      dimension.id,
      dimension.value
    )
    const currentEntries = pruneEntries(
      store.get(bucketKey) || [],
      now,
      normalizedWindowMs
    )

    if (currentEntries.length >= dimension.limit) {
      const oldestAllowedTimestamp = currentEntries[0] || now
      const retryAfterMs = Math.max(
        1000,
        normalizedWindowMs - (now - oldestAllowedTimestamp)
      )

      throw new SlidingWindowRateLimitError({
        message,
        retryAfterMs,
        dimension: dimension.id,
        key: bucketKey,
      })
    }

    pendingUpdates.push({
      bucketKey,
      entries: [...currentEntries, now],
    })
  }

  for (const update of pendingUpdates) {
    store.set(update.bucketKey, update.entries)
  }
}

