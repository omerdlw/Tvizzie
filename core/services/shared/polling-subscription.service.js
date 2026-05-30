import {
  SHARED_ENTRY_RETRY_BASE_MS,
  SHARED_ENTRY_RETRY_MAX_ATTEMPTS,
  SUBSCRIPTION_CACHE_TTL_MS,
} from './polling-subscription.constants';
import {
  clearEntryCleanup,
  clearEntryPayload,
  clearEntryPoll,
  clearEntryRetry,
  createSharedEntry,
  emitSharedError,
  emitSharedPayload,
  normalizeIntervalMs,
  resolveSubscriberPollInterval,
  stableSerialize,
  storeEntryPayload,
} from './polling-subscription.shared';

const sharedSubscriptionRegistry = new Map();

function scheduleEntryCleanup(entry) {
  clearEntryCleanup(entry);
  clearEntryRetry(entry);
  clearEntryPoll(entry);
  entry.cleanupTimer = setTimeout(() => {
    if (entry.subscribers.size > 0 || entry.inFlight) {
      return;
    }

    sharedSubscriptionRegistry.delete(entry.key);
  }, SUBSCRIPTION_CACHE_TTL_MS);
}

function resolveEntryPollInterval(entry) {
  if (!entry || entry.subscribers.size === 0 || typeof window === 'undefined') {
    return null;
  }

  const isHidden = typeof document !== 'undefined' && document.hidden === true;
  let nextInterval = null;

  entry.subscribers.forEach((subscriber) => {
    const interval = normalizeIntervalMs(resolveSubscriberPollInterval(subscriber, isHidden));

    if (!interval) {
      return;
    }

    if (!nextInterval || interval < nextInterval) {
      nextInterval = interval;
    }
  });

  return nextInterval;
}

function scheduleEntryPoll(entry) {
  clearEntryPoll(entry);

  if (!entry || entry.subscribers.size === 0 || entry.inFlight) {
    return;
  }

  const pollIntervalMs = resolveEntryPollInterval(entry);

  if (!pollIntervalMs) {
    return;
  }

  entry.pollTimer = setTimeout(() => {
    entry.pollTimer = null;

    if (entry.subscribers.size === 0) {
      return;
    }

    void runSharedEntry(entry, {
      forceEmit: false,
    }).catch(() => {});
  }, pollIntervalMs);
}

async function runSharedEntry(entry, options = {}) {
  if (!entry || entry.inFlight) {
    return entry?.inFlightPromise || undefined;
  }

  clearEntryRetry(entry);
  clearEntryPoll(entry);
  entry.inFlight = true;
  entry.inFlightPromise = (async () => {
    try {
      const payload = await entry.fetcher();
      const nextSignature = stableSerialize(payload);
      const hasChanged = !entry.hasPayload || entry.lastPayloadSignature !== nextSignature;

      entry.hasPayload = true;
      entry.lastPayload = payload;
      entry.lastPayloadSignature = nextSignature;
      entry.lastResolvedAt = Date.now();
      entry.retryAttempt = 0;

      if (hasChanged || options.forceEmit === true) {
        emitSharedPayload(entry, payload);
      }

      return payload;
    } catch (error) {
      emitSharedError(entry, error);

      const canRetry = entry.subscribers.size > 0 && entry.retryAttempt < SHARED_ENTRY_RETRY_MAX_ATTEMPTS;

      if (canRetry) {
        entry.retryAttempt += 1;
        const retryDelayMs = SHARED_ENTRY_RETRY_BASE_MS * Math.max(1, entry.retryAttempt);

        entry.retryTimer = setTimeout(() => {
          if (entry.subscribers.size === 0) {
            return;
          }

          void runSharedEntry(entry, {
            forceEmit: false,
          }).catch(() => {});
        }, retryDelayMs);
      }

      throw error;
    } finally {
      entry.inFlight = false;
      entry.inFlightPromise = null;

      if (entry.subscribers.size === 0) {
        scheduleEntryCleanup(entry);
      } else {
        scheduleEntryPoll(entry);
      }
    }
  })();

  return entry.inFlightPromise;
}

function subscribeToSharedEntry(subscriptionKey, fetcher, callback, options = {}) {
  const shouldEmitCachedPayloadOnSubscribe = options.emitCachedPayloadOnSubscribe !== false;
  const subscriber = {
    callback,
    hiddenIntervalMs: normalizeIntervalMs(options.hiddenIntervalMs),
    intervalMs: normalizeIntervalMs(options.intervalMs),
    onError: options.onError,
  };
  let entry = sharedSubscriptionRegistry.get(subscriptionKey);

  if (!entry) {
    entry = createSharedEntry(subscriptionKey, fetcher);
    sharedSubscriptionRegistry.set(subscriptionKey, entry);
  }

  entry.fetcher = fetcher;
  clearEntryCleanup(entry);
  entry.subscribers.add(subscriber);

  const hadPayloadOnSubscribe = entry.hasPayload;

  if (hadPayloadOnSubscribe && shouldEmitCachedPayloadOnSubscribe) {
    callback(entry.lastPayload);
  }

  const shouldFetch = options.fetchOnSubscribe !== false && (!entry.hasPayload || options.refreshOnSubscribe === true);

  if (shouldFetch) {
    // Delay the initial fetch slightly to the next microtask. This ensures
    // that if multiple components subscribe to the same key during the same
    // synchronous execution (common in React trees), they are all registered
    // and share the same first fetch rather than triggering redundant ones.
    Promise.resolve().then(() => {
      void runSharedEntry(entry, {
        forceEmit: !hadPayloadOnSubscribe || !shouldEmitCachedPayloadOnSubscribe,
      }).catch(() => {});
    });
  } else {
    scheduleEntryPoll(entry);
  }

  return () => {
    entry.subscribers.delete(subscriber);

    if (entry.subscribers.size === 0) {
      scheduleEntryCleanup(entry);
      entry.retryAttempt = 0;
    } else {
      scheduleEntryPoll(entry);
    }
  };
}

function createIsolatedPollingSubscription(fetcher, callback, options = {}) {
  let disposed = false;

  void Promise.resolve()
    .then(() => fetcher())
    .then((payload) => {
      if (!disposed) {
        callback(payload);
      }
    })
    .catch((error) => {
      if (typeof options.onError === 'function') {
        options.onError(error);
      }
    });

  return () => {
    disposed = true;
  };
}

export function buildPollingSubscriptionKey(scope, params = {}) {
  return `${String(scope || 'subscription').trim()}:${stableSerialize(params)}`;
}

export function createPollingSubscription(fetcher, callback, options = {}) {
  const subscriptionKey = String(options.subscriptionKey || '').trim();

  if (subscriptionKey) {
    return subscribeToSharedEntry(subscriptionKey, fetcher, callback, options);
  }

  return createIsolatedPollingSubscription(fetcher, callback, options);
}

export function refreshPollingSubscription(subscriptionKey, options = {}) {
  const resolvedKey = String(subscriptionKey || '').trim();

  if (!resolvedKey) {
    return Promise.resolve(undefined);
  }

  const entry = sharedSubscriptionRegistry.get(resolvedKey);

  if (!entry) {
    return Promise.resolve(undefined);
  }

  clearEntryCleanup(entry);

  return runSharedEntry(entry, {
    forceEmit: options.forceEmit === true,
  });
}

export function primePollingSubscription(subscriptionKey, payload, options = {}) {
  const resolvedKey = String(subscriptionKey || '').trim();

  if (!resolvedKey) {
    return;
  }

  let entry = sharedSubscriptionRegistry.get(resolvedKey);

  if (!entry) {
    entry = createSharedEntry(resolvedKey, async () => payload);
    sharedSubscriptionRegistry.set(resolvedKey, entry);
  }

  clearEntryCleanup(entry);
  storeEntryPayload(entry, payload);

  if (options.emit !== false && entry.subscribers.size > 0) {
    emitSharedPayload(entry, payload);
  }

  if (entry.subscribers.size > 0) {
    scheduleEntryPoll(entry);
  }
}

export function invalidatePollingSubscription(subscriptionKey, options = {}) {
  const resolvedKey = String(subscriptionKey || '').trim();

  if (!resolvedKey) {
    return;
  }

  const entry = sharedSubscriptionRegistry.get(resolvedKey);

  if (!entry) {
    return;
  }

  clearEntryCleanup(entry);

  if (options.payload !== undefined) {
    primePollingSubscription(resolvedKey, options.payload, {
      emit: options.emit !== false,
    });
    return;
  }

  if (options.clearCache !== false) {
    clearEntryPayload(entry);
  }

  if (options.refetch === true && entry.subscribers.size > 0) {
    // Avoid `unhandledRejection` for background refetches.
    void runSharedEntry(entry, {
      forceEmit: options.forceEmit === true,
    }).catch(() => {});
  }
}

export function invalidatePollingSubscriptions(keys = [], options = {}) {
  keys.forEach((key) => {
    invalidatePollingSubscription(key, options);
  });
}
