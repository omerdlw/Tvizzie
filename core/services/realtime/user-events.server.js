import 'server-only';

import { randomUUID } from 'crypto';
import { publishUserRealtimeBroadcast } from '@/core/services/realtime/realtime-broadcast.server';

const HEARTBEAT_INTERVAL_MS = 25000;
const USER_SUBSCRIBERS_GLOBAL_KEY = '__tvizzie_user_live_subscribers__';

const encoder = new TextEncoder();

function getUserSubscribersStore() {
  if (!globalThis[USER_SUBSCRIBERS_GLOBAL_KEY]) {
    globalThis[USER_SUBSCRIBERS_GLOBAL_KEY] = new Map();
  }

  return globalThis[USER_SUBSCRIBERS_GLOBAL_KEY];
}

const userSubscribers = getUserSubscribersStore();

function normalizeValue(value) {
  return String(value || '').trim();
}

function formatSseMessage(eventType, payload = {}, meta = {}) {
  return encoder.encode(
    `event: ${eventType}\ndata: ${JSON.stringify({
      createdAt: new Date().toISOString(),
      eventId: meta.eventId || `evt_${randomUUID()}`,
      ...payload,
      timestamp: Date.now(),
      traceId: meta.traceId || null,
    })}\n\n`
  );
}

function getUserSet(userId) {
  const normalizedUserId = normalizeValue(userId);

  if (!normalizedUserId) {
    return null;
  }

  let subscribers = userSubscribers.get(normalizedUserId);

  if (!subscribers) {
    subscribers = new Set();
    userSubscribers.set(normalizedUserId, subscribers);
  }

  return subscribers;
}

function removeUserSubscriber(userId, subscriber) {
  const subscribers = userSubscribers.get(userId);

  if (!subscribers) {
    return;
  }

  subscribers.delete(subscriber);

  if (subscribers.size === 0) {
    userSubscribers.delete(userId);
  }
}

function safeEnqueue(controller, chunk) {
  try {
    controller.enqueue(chunk);
    return true;
  } catch {
    return false;
  }
}

export function publishUserEvent(userId, eventType, payload = {}, meta = {}) {
  const normalizedUserId = normalizeValue(userId);
  const normalizedEventType = normalizeValue(eventType);
  const normalizedPayload = {
    createdAt: new Date().toISOString(),
    eventId: meta.eventId || `evt_${randomUUID()}`,
    ...payload,
    timestamp: Date.now(),
    traceId: meta.traceId || null,
  };

  if (!normalizedUserId || !normalizedEventType) {
    return;
  }

  publishUserRealtimeBroadcast({
    userId: normalizedUserId,
    eventType: normalizedEventType,
    payload: normalizedPayload,
  }).catch((error) => {
    console.error('[LiveUpdates] Realtime broadcast failed:', error);
  });

  const subscribers = userSubscribers.get(normalizedUserId);

  if (!subscribers?.size) {
    return;
  }

  const chunk = formatSseMessage(normalizedEventType, normalizedPayload, {
    eventId: normalizedPayload.eventId,
    traceId: normalizedPayload.traceId,
  });

  subscribers.forEach((subscriber) => {
    if (!safeEnqueue(subscriber.controller, chunk)) {
      subscriber.cleanup();
    }
  });
}

export function createUserEventStream(userId) {
  const normalizedUserId = normalizeValue(userId);
  let cleanupCurrent = () => {};

  return new ReadableStream({
    start(controller) {
      const subscribers = getUserSet(normalizedUserId);

      if (!subscribers) {
        controller.close();
        return;
      }

      let closed = false;
      let heartbeatTimer = null;

      const cleanup = () => {
        if (closed) {
          return;
        }

        closed = true;

        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }

        removeUserSubscriber(normalizedUserId, subscriber);

        try {
          controller.close();
        } catch {
          // Stream may already be closed during teardown.
        }
      };

      cleanupCurrent = cleanup;

      const subscriber = {
        cleanup,
        controller,
      };

      subscribers.add(subscriber);

      safeEnqueue(controller, encoder.encode('retry: 1000\n\n'));
      safeEnqueue(controller, formatSseMessage('ready', { ok: true }));

      heartbeatTimer = setInterval(() => {
        if (!safeEnqueue(controller, formatSseMessage('ping', { ok: true }))) {
          cleanup();
        }
      }, HEARTBEAT_INTERVAL_MS);
    },
    cancel() {
      cleanupCurrent();
    },
  });
}
