import { normalizeValue } from '@/shared';
import {
  createClient as createSupabaseBrowserClient,
  getBrowserSupabaseAccessToken,
} from '@/infrastructure/supabase/client';

export const DEFAULT_REALTIME_TRANSPORT_MODE = 'realtime';

export function getRealtimeTransportMode() {
  return DEFAULT_REALTIME_TRANSPORT_MODE;
}

export function isRealtimeTransportEnabled() {
  const mode = getRealtimeTransportMode();
  return mode === 'realtime' || mode === 'dual_observe';
}

export function isDualObserveTransportMode() {
  return getRealtimeTransportMode() === 'dual_observe';
}

export const PROFILE_LIVE_EVENT_TYPE = 'account';

export function buildProfileRealtimeTopic(profileReference) {
  const normalizedReference = normalizeValue(profileReference).toLowerCase();
  return normalizedReference ? `profile-updates:${normalizedReference}` : '';
}

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
    return (
      subscriber.hiddenIntervalMs ??
      (subscriber.intervalMs ? Math.max(subscriber.intervalMs * 4, 120000) : null)
    );
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

const sharedSubscriptionRegistry = new Map();

const SUBSCRIPTION_CACHE_TTL_MS = 10000;
const SHARED_ENTRY_RETRY_BASE_MS = 700;
const SHARED_ENTRY_RETRY_MAX_ATTEMPTS = 2;

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

      const canRetry =
        entry.subscribers.size > 0 && entry.retryAttempt < SHARED_ENTRY_RETRY_MAX_ATTEMPTS;

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

  if (Object.prototype.hasOwnProperty.call(options, 'initialPayload')) {
    storeEntryPayload(entry, options.initialPayload);
  }

  const hadPayloadOnSubscribe = entry.hasPayload;

  if (hadPayloadOnSubscribe && shouldEmitCachedPayloadOnSubscribe) {
    callback(entry.lastPayload);
  }

  const shouldFetch =
    options.fetchOnSubscribe !== false &&
    (!entry.hasPayload || options.refreshOnSubscribe === true);

  if (shouldFetch) {
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

  const matchingKeys = [];
  for (const registryKey of sharedSubscriptionRegistry.keys()) {
    if (registryKey === resolvedKey || registryKey.startsWith(resolvedKey + ':')) {
      matchingKeys.push(registryKey);
    }
  }

  for (const key of matchingKeys) {
    const entry = sharedSubscriptionRegistry.get(key);
    if (!entry) continue;

    clearEntryCleanup(entry);

    if (options.payload !== undefined && key === resolvedKey) {
      primePollingSubscription(resolvedKey, options.payload, {
        emit: options.emit !== false,
      });
      continue;
    }

    if (options.clearCache !== false) {
      clearEntryPayload(entry);
    }

    if (options.refetch === true && entry.subscribers.size > 0) {
      void runSharedEntry(entry, {
        forceEmit: options.forceEmit === true,
      }).catch(() => {});
    }
  }
}

export function invalidatePollingSubscriptions(keys = [], options = {}) {
  keys.forEach((key) => {
    invalidatePollingSubscription(key, options);
  });
}



const eventSourceRegistry = new Map();
const publicChannelRegistry = new Map();

const MAX_CONSECUTIVE_ERRORS = 5;
const BASE_RETRY_DELAY_MS = 2000;
const MAX_RETRY_DELAY_MS = 30000;
const LIVE_EVENT_TYPES = ['follows', 'notifications', 'reviews', 'account', 'ready', 'ping'];

function dispatchEvent(entry, eventType, payload) {
  const listeners = entry.listeners.get(eventType);

  if (!listeners?.size) {
    return;
  }

  listeners.forEach((listener) => {
    listener(payload);
  });
}

function scheduleReconnect(entry) {
  if (entry.reconnectTimer || !entry.listeners.size) {
    return;
  }

  const delay = Math.min(
    BASE_RETRY_DELAY_MS * Math.pow(2, entry.errorCount - 1),
    MAX_RETRY_DELAY_MS,
  );

  entry.reconnectTimer = setTimeout(() => {
    entry.reconnectTimer = null;
    entry.source = null;
    entry.realtimeChannel = null;
    attachEntrySources(entry);
  }, delay);
}

function parseEventPayload(rawPayload = {}) {
  if (!rawPayload || typeof rawPayload !== 'object') {
    return {
      payload: {},
      type: 'unknown',
    };
  }

  const type = normalizeValue(
    rawPayload.eventType || rawPayload.type || rawPayload.event || 'unknown',
  );
  const payload =
    rawPayload.payload && typeof rawPayload.payload === 'object' ? rawPayload.payload : rawPayload;

  return {
    payload,
    type,
  };
}

function attachSseSource(entry) {
  if (entry.source || typeof window === 'undefined' || typeof EventSource !== 'function') {
    return;
  }

  if (entry.errorCount >= MAX_CONSECUTIVE_ERRORS) {
    entry.reconnectTimer = setTimeout(() => {
      entry.reconnectTimer = null;
      entry.errorCount = 0;
      entry.source = null;
      attachEntrySources(entry);
    }, MAX_RETRY_DELAY_MS);
    return;
  }

  const source = new EventSource('/api/live-updates');
  entry.source = source;

  LIVE_EVENT_TYPES.forEach((eventType) => {
    source.addEventListener(eventType, (event) => {
      entry.errorCount = 0;
      let payload = {};

      try {
        payload = JSON.parse(event?.data || '{}');
      } catch {
        payload = {};
      }

      dispatchEvent(entry, eventType, payload);
    });
  });

  source.onerror = () => {
    entry.errorCount = (entry.errorCount || 0) + 1;

    source.close();
    entry.source = null;

    dispatchEvent(entry, 'error', {
      provider: 'sse',
    });
    scheduleReconnect(entry);
  };
}

function attachSupabaseRealtimeSource(entry) {
  if (entry.realtimeChannel || typeof window === 'undefined') {
    return;
  }

  let supabaseClient = null;

  try {
    supabaseClient = createSupabaseBrowserClient();
  } catch {
    supabaseClient = null;
  }

  if (!supabaseClient?.channel) {
    return;
  }

  const accessToken = getBrowserSupabaseAccessToken();

  if (!accessToken || typeof supabaseClient?.realtime?.setAuth !== 'function') {
    dispatchEvent(entry, 'error', {
      provider: 'realtime',
      status: 'AUTH_TOKEN_MISSING',
    });
    return;
  }

  const channelName = `live-updates:${entry.userId}`;
  const channel = supabaseClient.channel(channelName, {
    config: {
      private: true,
      broadcast: {
        self: false,
      },
    },
  });

  channel.on('broadcast', { event: 'live' }, (event) => {
    const { payload, type } = parseEventPayload(event?.payload || {});

    if (!LIVE_EVENT_TYPES.includes(type)) {
      return;
    }

    entry.errorCount = 0;
    dispatchEvent(entry, type, payload || {});
  });

  entry.realtimeChannel = channel;

  void supabaseClient.realtime
    .setAuth(accessToken)
    .then(() => {
      if (entry.realtimeChannel !== channel) {
        return;
      }

      channel.subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          entry.errorCount = (entry.errorCount || 0) + 1;
          dispatchEvent(entry, 'error', {
            provider: 'realtime',
            status,
          });

          try {
            channel.unsubscribe();
          } catch {}

          entry.realtimeChannel = null;
          scheduleReconnect(entry);
        }
      });
    })
    .catch(() => {
      if (entry.realtimeChannel !== channel) {
        return;
      }

      entry.errorCount = (entry.errorCount || 0) + 1;
      dispatchEvent(entry, 'error', {
        provider: 'realtime',
        status: 'AUTH_FAILED',
      });
      try {
        channel.unsubscribe();
      } catch {}
      entry.realtimeChannel = null;
      scheduleReconnect(entry);
    });
}

function attachEntrySources(entry) {
  const mode = getRealtimeTransportMode();

  if (mode === 'realtime') {
    attachSupabaseRealtimeSource(entry);

    if (!entry.realtimeChannel) {
      attachSseSource(entry);
    }

    return;
  }

  if (mode === 'dual_observe') {
    attachSupabaseRealtimeSource(entry);
    attachSseSource(entry);
    return;
  }

  attachSseSource(entry);
}

function detachEntrySource(entry) {
  if (entry.reconnectTimer) {
    clearTimeout(entry.reconnectTimer);
    entry.reconnectTimer = null;
  }

  if (entry.source) {
    entry.source.close();
    entry.source = null;
  }

  if (entry.realtimeChannel) {
    try {
      entry.realtimeChannel.unsubscribe();
    } catch {}

    entry.realtimeChannel = null;
  }

  entry.errorCount = 0;
}

function ensureEntry(userId) {
  const normalizedUserId = normalizeValue(userId);

  if (!normalizedUserId) {
    return null;
  }

  let entry = eventSourceRegistry.get(normalizedUserId);

  if (!entry) {
    entry = {
      errorCount: 0,
      listeners: new Map(),
      reconnectTimer: null,
      realtimeChannel: null,
      source: null,
      userId: normalizedUserId,
    };
    eventSourceRegistry.set(normalizedUserId, entry);
  }

  attachEntrySources(entry);
  return entry;
}

export function subscribeToUserLiveEvent(userId, eventType, callback) {
  const normalizedEventType = normalizeValue(eventType);
  const entry = ensureEntry(userId);

  if (!entry || !normalizedEventType || typeof callback !== 'function') {
    return () => {};
  }

  let listeners = entry.listeners.get(normalizedEventType);

  if (!listeners) {
    listeners = new Set();
    entry.listeners.set(normalizedEventType, listeners);
  }

  listeners.add(callback);

  return () => {
    listeners.delete(callback);

    if (listeners.size === 0) {
      entry.listeners.delete(normalizedEventType);
    }

    if (entry.listeners.size === 0) {
      detachEntrySource(entry);
      eventSourceRegistry.delete(entry.userId);
    }
  };
}

function attachPublicRealtimeSource(entry) {
  if (entry.realtimeChannel || entry.reconnectTimer || typeof window === 'undefined') {
    return;
  }

  let supabaseClient = null;

  try {
    supabaseClient = createSupabaseBrowserClient();
  } catch {
    supabaseClient = null;
  }

  if (!supabaseClient?.channel) {
    return;
  }

  const channel = supabaseClient.channel(entry.topic, {
    config: {
      private: false,
      broadcast: {
        self: false,
      },
    },
  });

  channel
    .on('broadcast', { event: 'live' }, (event) => {
      const { payload, type } = parseEventPayload(event?.payload || {});
      entry.errorCount = 0;
      dispatchEvent(entry, type, payload || {});
    })
    .subscribe((status) => {
      if (status !== 'CHANNEL_ERROR' && status !== 'TIMED_OUT') {
        return;
      }

      entry.errorCount = (entry.errorCount || 0) + 1;

      try {
        channel.unsubscribe();
      } catch {}

      entry.realtimeChannel = null;
      const delay = Math.min(
        BASE_RETRY_DELAY_MS * Math.pow(2, Math.max(0, entry.errorCount - 1)),
        MAX_RETRY_DELAY_MS,
      );
      entry.reconnectTimer = setTimeout(() => {
        entry.reconnectTimer = null;
        attachPublicRealtimeSource(entry);
      }, delay);
    });

  entry.realtimeChannel = channel;
}

export function subscribeToPublicLiveEvent(topic, eventType, callback) {
  const normalizedTopic = normalizeValue(topic);
  const normalizedEventType = normalizeValue(eventType);

  if (!normalizedTopic || !normalizedEventType || typeof callback !== 'function') {
    return () => {};
  }

  let entry = publicChannelRegistry.get(normalizedTopic);

  if (!entry) {
    entry = {
      errorCount: 0,
      listeners: new Map(),
      realtimeChannel: null,
      reconnectTimer: null,
      topic: normalizedTopic,
    };
    publicChannelRegistry.set(normalizedTopic, entry);
  }

  let listeners = entry.listeners.get(normalizedEventType);

  if (!listeners) {
    listeners = new Set();
    entry.listeners.set(normalizedEventType, listeners);
  }

  listeners.add(callback);
  attachPublicRealtimeSource(entry);

  return () => {
    listeners.delete(callback);

    if (listeners.size === 0) {
      entry.listeners.delete(normalizedEventType);
    }

    if (entry.listeners.size > 0) {
      return;
    }

    if (entry.reconnectTimer) {
      clearTimeout(entry.reconnectTimer);
      entry.reconnectTimer = null;
    }

    if (entry.realtimeChannel) {
      try {
        entry.realtimeChannel.unsubscribe();
      } catch {}
      entry.realtimeChannel = null;
    }

    publicChannelRegistry.delete(normalizedTopic);
  };
}

