export function normalizeIntervalMs(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.floor(parsed);
}

export function stableSerialize(value) {
  if (value === null || value === undefined) {
    return String(value);
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }

  if (value instanceof Date) {
    return `date:${value.toISOString()}`;
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }

  if (typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(String(value));
}

export function clearEntryCleanup(entry) {
  if (entry.cleanupTimer) {
    clearTimeout(entry.cleanupTimer);
    entry.cleanupTimer = null;
  }
}

export function clearEntryRetry(entry) {
  if (entry.retryTimer) {
    clearTimeout(entry.retryTimer);
    entry.retryTimer = null;
  }
}

export function clearEntryPoll(entry) {
  if (entry.pollTimer) {
    clearTimeout(entry.pollTimer);
    entry.pollTimer = null;
  }
}

export function emitSharedPayload(entry, payload) {
  entry.subscribers.forEach((subscriber) => {
    subscriber.callback(payload);
  });
}

export function emitSharedError(entry, error) {
  entry.subscribers.forEach((subscriber) => {
    if (typeof subscriber.onError === 'function') {
      subscriber.onError(error);
    }
  });
}

export function clearEntryPayload(entry) {
  entry.hasPayload = false;
  entry.lastPayload = undefined;
  entry.lastPayloadSignature = '';
  entry.lastResolvedAt = 0;
}

export function storeEntryPayload(entry, payload) {
  entry.hasPayload = true;
  entry.lastPayload = payload;
  entry.lastPayloadSignature = stableSerialize(payload);
  entry.lastResolvedAt = Date.now();
}

export function resolveSubscriberPollInterval(subscriber, isHidden = false) {
  if (!subscriber) {
    return null;
  }

  if (isHidden) {
    return subscriber.hiddenIntervalMs ?? subscriber.intervalMs ?? null;
  }

  return subscriber.intervalMs ?? null;
}

export function createSharedEntry(key, fetcher) {
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
    pollTimer: null,
    retryAttempt: 0,
    retryTimer: null,
    subscribers: new Set(),
  };
}
