import 'server-only';
import { randomUUID } from 'crypto';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { normalizeValue } from '@/shared';
import {
  assertSupabaseServerAdminEnv,
  SUPABASE_SERVICE_ROLE_KEY,
} from '@/infrastructure/supabase/server';
import { SUPABASE_URL } from '@/infrastructure/supabase/client';
import { isTransientSessionError, requireProtectedSession } from '@/domains/auth/server/session.js';
import {
  buildInternalRequestMeta,
  createApiErrorResponse,
  createApiSuccessResponse,
  setResponseRequestMeta,
} from '@/infrastructure/http/server';

import { isRealtimeTransportEnabled } from './client.js';

export * from './client.js';

const REALTIME_ADMIN_CLIENT_KEY = '__tvizzie_realtime_admin_client__';

function buildChannelName(userId) {
  return `live-updates:${userId}`;
}

function getRealtimeAdminClient() {
  assertSupabaseServerAdminEnv();

  if (!globalThis[REALTIME_ADMIN_CLIENT_KEY]) {
    globalThis[REALTIME_ADMIN_CLIENT_KEY] = createSupabaseClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  return globalThis[REALTIME_ADMIN_CLIENT_KEY];
}

async function publishRealtimeBroadcast({ channelName, eventType, isPrivate, payload = {} }) {
  if (!isRealtimeTransportEnabled()) {
    return {
      delivered: false,
      reason: 'transport-disabled',
    };
  }

  const normalizedChannelName = normalizeValue(channelName);
  const normalizedEventType = normalizeValue(eventType);

  if (!normalizedChannelName || !normalizedEventType) {
    return {
      delivered: false,
      reason: 'invalid-event',
    };
  }

  let client = null;

  try {
    client = getRealtimeAdminClient();
  } catch {
    return {
      delivered: false,
      reason: 'realtime-config-missing',
    };
  }

  const channel = client.channel(normalizedChannelName, {
    config: {
      private: isPrivate === true,
      broadcast: {
        ack: false,
        self: false,
      },
    },
  });

  try {
    const response = await channel.httpSend('live', {
      eventType: normalizedEventType,
      payload,
    });

    if (response?.success !== true) {
      return {
        delivered: false,
        reason: 'broadcast-send-failed',
        status: response?.status || null,
      };
    }

    return {
      delivered: true,
    };
  } finally {
    if (typeof client?.removeChannel === 'function') {
      client.removeChannel(channel).catch(() => {});
    }
  }
}

export async function publishUserRealtimeBroadcast({ userId, eventType, payload = {} }) {
  const normalizedUserId = normalizeValue(userId);

  return publishRealtimeBroadcast({
    channelName: normalizedUserId ? buildChannelName(normalizedUserId) : '',
    eventType,
    isPrivate: true,
    payload,
  });
}

export async function publishPublicRealtimeBroadcast({ channelName, eventType, payload = {} }) {
  return publishRealtimeBroadcast({
    channelName,
    eventType,
    isPrivate: false,
    payload,
  });
}

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

function formatSseMessage(eventType, payload = {}, meta = {}) {
  return encoder.encode(
    `event: ${eventType}\ndata: ${JSON.stringify({
      createdAt: new Date().toISOString(),
      eventId: meta.eventId || `evt_${randomUUID()}`,
      ...payload,
      timestamp: Date.now(),
      traceId: meta.traceId || null,
    })}\n\n`,
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

export async function publishUserEvent(userId, eventType, payload = {}, meta = {}) {
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
    return { delivered: false, reason: 'invalid-event' };
  }

  const broadcastPromise = publishUserRealtimeBroadcast({
    userId: normalizedUserId,
    eventType: normalizedEventType,
    payload: normalizedPayload,
  });

  const subscribers = userSubscribers.get(normalizedUserId);

  if (subscribers?.size) {
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

  try {
    return await broadcastPromise;
  } catch (error) {
    console.error('[LiveUpdates] Realtime broadcast failed:', error);
    return { delivered: false, reason: 'broadcast-error' };
  }
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
        } catch {}
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

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const requestMeta = buildInternalRequestMeta({
    request,
    source: 'api/live-updates',
  });
  try {
    const authContext = await requireProtectedSession(request);
    const stream = createUserEventStream(authContext.userId);
    const response = new Response(stream, {
      headers: {
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'Content-Type': 'text/event-stream; charset=utf-8',
        'X-Accel-Buffering': 'no',
      },
    });

    return setResponseRequestMeta(response, {
      ...requestMeta,
      sessionId: authContext.sessionJti,
      userId: authContext.userId,
    });
  } catch (error) {
    if (isTransientSessionError(error)) {
      return setResponseRequestMeta(
        new Response('Service temporarily unavailable', { status: 503 }),
        requestMeta,
      );
    }
    return setResponseRequestMeta(
      new Response('Authentication required', { status: 401 }),
      requestMeta,
    );
  }
}
const SUPPORTED_EVENT_TYPES = new Set(['reviews']);

function normalizeErrorMessage(error) {
  return normalizeValue(error?.message || 'Live update event failed');
}

function resolveStatusCode(message) {
  if (
    message.includes('Authentication session is required') ||
    message.includes('Invalid or expired authentication token') ||
    message.includes('Authentication token has been revoked')
  ) {
    return 401;
  }

  if (message.includes('invalid') || message.includes('unsupported')) {
    return 400;
  }

  return 500;
}

export async function POST(request) {
  const requestMeta = buildInternalRequestMeta({
    request,
    source: 'api/live-updates/events',
  });
  try {
    const authContext = await requireProtectedSession(request);
    const body = await request.json().catch(() => ({}));
    const eventType = normalizeValue(body?.eventType);
    const payload = body?.payload && typeof body.payload === 'object' ? body.payload : {};
    const targetUserIds = Array.isArray(body?.targetUserIds)
      ? [...new Set(body.targetUserIds.map((value) => normalizeValue(value)).filter(Boolean))]
      : [];

    if (!SUPPORTED_EVENT_TYPES.has(eventType)) {
      throw new Error('unsupported-live-event-type');
    }

    if (!targetUserIds.length) {
      throw new Error('invalid-live-event-targets');
    }

    await Promise.all(
      targetUserIds.map((userId) =>
        publishUserEvent(userId, eventType, payload, {
          traceId: requestMeta.traceId,
        }),
      ),
    );

    return createApiSuccessResponse(
      {
        delivered: true,
        eventType,
        targetCount: targetUserIds.length,
      },
      {
        legacyPayload: {
          delivered: true,
          eventType,
          targetCount: targetUserIds.length,
        },
        requestMeta: {
          ...requestMeta,
          sessionId: authContext.sessionJti,
          userId: authContext.userId,
        },
      },
    );
  } catch (error) {
    const message = normalizeErrorMessage(error);

    return createApiErrorResponse(
      {
        code: 'LIVE_EVENT_PUBLISH_FAILED',
        message,
      },
      {
        requestMeta,
        status: resolveStatusCode(message),
      },
    );
  }
}
