const SUBSCRIPTION_CACHE_TTL_MS = 10000

const sharedSubscriptionRegistry = new Map()

function stableSerialize(value) {
  if (value === null || value === undefined) {
    return String(value)
  }

  if (typeof value === 'string') {
    return JSON.stringify(value)
  }

  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value)
  }

  if (value instanceof Date) {
    return `date:${value.toISOString()}`
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`
  }

  if (typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
      .join(',')}}`
  }

  return JSON.stringify(String(value))
}

function clearEntryCleanup(entry) {
  if (entry.cleanupTimer) {
    clearTimeout(entry.cleanupTimer)
    entry.cleanupTimer = null
  }
}

function emitSharedPayload(entry, payload) {
  entry.subscribers.forEach((subscriber) => {
    subscriber.callback(payload)
  })
}

function emitSharedError(entry, error) {
  entry.subscribers.forEach((subscriber) => {
    if (typeof subscriber.onError === 'function') {
      subscriber.onError(error)
    }
  })
}

function scheduleEntryCleanup(entry) {
  clearEntryCleanup(entry)
  entry.cleanupTimer = setTimeout(() => {
    if (entry.subscribers.size > 0 || entry.inFlight) {
      return
    }

    sharedSubscriptionRegistry.delete(entry.key)
  }, SUBSCRIPTION_CACHE_TTL_MS)
}

function clearEntryPayload(entry) {
  entry.hasPayload = false
  entry.lastPayload = undefined
  entry.lastPayloadSignature = ''
  entry.lastResolvedAt = 0
}

function storeEntryPayload(entry, payload) {
  entry.hasPayload = true
  entry.lastPayload = payload
  entry.lastPayloadSignature = stableSerialize(payload)
  entry.lastResolvedAt = Date.now()
}

async function runSharedEntry(entry, options = {}) {
  if (!entry || entry.inFlight) {
    return entry?.inFlightPromise || undefined
  }

  entry.inFlight = true
  entry.inFlightPromise = (async () => {
    try {
      const payload = await entry.fetcher()
      const nextSignature = stableSerialize(payload)
      const hasChanged =
        !entry.hasPayload || entry.lastPayloadSignature !== nextSignature

      entry.hasPayload = true
      entry.lastPayload = payload
      entry.lastPayloadSignature = nextSignature
      entry.lastResolvedAt = Date.now()

      if (hasChanged || options.forceEmit === true) {
        emitSharedPayload(entry, payload)
      }

      return payload
    } catch (error) {
      emitSharedError(entry, error)
      throw error
    } finally {
      entry.inFlight = false
      entry.inFlightPromise = null

      if (entry.subscribers.size === 0) {
        scheduleEntryCleanup(entry)
      }
    }
  })()

  return entry.inFlightPromise
}

function createSharedEntry(key, fetcher) {
  return {
    cleanupTimer: null,
    fetcher,
    hasPayload: false,
    inFlight: false,
    inFlightPromise: null,
    key,
    lastPayload: undefined,
    lastPayloadSignature: '',
    lastResolvedAt: 0,
    subscribers: new Set(),
  }
}

function subscribeToSharedEntry(subscriptionKey, fetcher, callback, options = {}) {
  const subscriber = {
    callback,
    onError: options.onError,
  }
  let entry = sharedSubscriptionRegistry.get(subscriptionKey)

  if (!entry) {
    entry = createSharedEntry(subscriptionKey, fetcher)
    sharedSubscriptionRegistry.set(subscriptionKey, entry)
  }

  entry.fetcher = fetcher
  clearEntryCleanup(entry)
  entry.subscribers.add(subscriber)

  if (entry.hasPayload) {
    callback(entry.lastPayload)
  }

  const shouldFetch =
    options.fetchOnSubscribe !== false &&
    (!entry.hasPayload || options.refreshOnSubscribe === true)

  if (shouldFetch) {
    // Delay the initial fetch slightly to the next microtask. This ensures
    // that if multiple components subscribe to the same key during the same
    // synchronous execution (common in React trees), they are all registered
    // and share the same first fetch rather than triggering redundant ones.
    Promise.resolve().then(() => {
      void runSharedEntry(entry, {
        forceEmit: !entry.hasPayload,
      }).catch(() => {})
    })
  }

  return () => {
    entry.subscribers.delete(subscriber)

    if (entry.subscribers.size === 0) {
      scheduleEntryCleanup(entry)
    }
  }
}

function createIsolatedPollingSubscription(fetcher, callback, options = {}) {
  let disposed = false

  void Promise.resolve()
    .then(() => fetcher())
    .then((payload) => {
      if (!disposed) {
        callback(payload)
      }
    })
    .catch((error) => {
      if (typeof options.onError === 'function') {
        options.onError(error)
      }
    })

  return () => {
    disposed = true
  }
}

export function buildPollingSubscriptionKey(scope, params = {}) {
  return `${String(scope || 'subscription').trim()}:${stableSerialize(params)}`
}

export function createPollingSubscription(fetcher, callback, options = {}) {
  const subscriptionKey = String(options.subscriptionKey || '').trim()

  if (subscriptionKey) {
    return subscribeToSharedEntry(subscriptionKey, fetcher, callback, options)
  }

  return createIsolatedPollingSubscription(fetcher, callback, options)
}

export function refreshPollingSubscription(subscriptionKey, options = {}) {
  const resolvedKey = String(subscriptionKey || '').trim()

  if (!resolvedKey) {
    return Promise.resolve(undefined)
  }

  const entry = sharedSubscriptionRegistry.get(resolvedKey)

  if (!entry) {
    return Promise.resolve(undefined)
  }

  clearEntryCleanup(entry)

  return runSharedEntry(entry, {
    forceEmit: options.forceEmit === true,
  })
}

export function primePollingSubscription(subscriptionKey, payload, options = {}) {
  const resolvedKey = String(subscriptionKey || '').trim()

  if (!resolvedKey) {
    return
  }

  let entry = sharedSubscriptionRegistry.get(resolvedKey)

  if (!entry) {
    entry = createSharedEntry(resolvedKey, async () => payload)
    sharedSubscriptionRegistry.set(resolvedKey, entry)
  }

  clearEntryCleanup(entry)
  storeEntryPayload(entry, payload)

  if (options.emit !== false && entry.subscribers.size > 0) {
    emitSharedPayload(entry, payload)
  }
}

export function invalidatePollingSubscription(subscriptionKey, options = {}) {
  const resolvedKey = String(subscriptionKey || '').trim()

  if (!resolvedKey) {
    return
  }

  const entry = sharedSubscriptionRegistry.get(resolvedKey)

  if (!entry) {
    return
  }

  clearEntryCleanup(entry)

  if (options.payload !== undefined) {
    primePollingSubscription(resolvedKey, options.payload, {
      emit: options.emit !== false,
    })
    return
  }

  if (options.clearCache !== false) {
    clearEntryPayload(entry)
  }

  if (options.refetch === true && entry.subscribers.size > 0) {
    // Avoid `unhandledRejection` for background refetches.
    void runSharedEntry(entry, {
      forceEmit: options.forceEmit === true,
    }).catch(() => {})
  }
}

export function invalidatePollingSubscriptions(keys = [], options = {}) {
  keys.forEach((key) => {
    invalidatePollingSubscription(key, options)
  })
}
