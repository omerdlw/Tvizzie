'use client';

import { createClient as createSupabaseBrowserClient } from '@/core/clients/supabase/client';
import { getRealtimeTransportMode } from '@/core/services/realtime/realtime-transport.config';

const eventSourceRegistry = new Map();

const MAX_CONSECUTIVE_ERRORS = 5;
const BASE_RETRY_DELAY_MS = 2000;
const MAX_RETRY_DELAY_MS = 30000;
const LIVE_EVENT_TYPES = ['follows', 'notifications', 'reviews', 'account', 'ready', 'ping'];

function normalizeValue(value) {
  return String(value || '').trim();
}

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

  const delay = Math.min(BASE_RETRY_DELAY_MS * Math.pow(2, entry.errorCount - 1), MAX_RETRY_DELAY_MS);

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

  const type = normalizeValue(rawPayload.eventType || rawPayload.type || rawPayload.event || 'unknown');
  const payload = rawPayload.payload && typeof rawPayload.payload === 'object' ? rawPayload.payload : rawPayload;

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

  const channelName = `live-updates:${entry.userId}`;
  const channel = supabaseClient.channel(channelName, {
    config: {
      broadcast: {
        self: false,
      },
    },
  });

  channel
    .on('broadcast', { event: 'live' }, (event) => {
      const { payload, type } = parseEventPayload(event?.payload || {});

      if (!LIVE_EVENT_TYPES.includes(type)) {
        return;
      }

      entry.errorCount = 0;
      dispatchEvent(entry, type, payload || {});
    })
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        entry.errorCount = (entry.errorCount || 0) + 1;
        dispatchEvent(entry, 'error', {
          provider: 'realtime',
          status,
        });

        try {
          channel.unsubscribe();
        } catch {
          // no-op
        }

        entry.realtimeChannel = null;
        scheduleReconnect(entry);
      }
    });

  entry.realtimeChannel = channel;
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
    } catch {
      // no-op
    }

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
