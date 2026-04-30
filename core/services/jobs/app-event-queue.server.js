import 'server-only';

import { createAdminClient } from '@/core/clients/supabase/admin';
import { processActivityEvent } from '@/core/services/activity/event-processor.server';
import { processNotificationEvent } from '@/core/services/notifications/event-processor.server';

export const APP_EVENT_JOB_KINDS = {
  ACTIVITY_EVENT: 'activity_event',
  NOTIFICATION_EVENT: 'notification_event',
};

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeLimit(value, fallback = 10) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(50, Math.max(1, Math.floor(parsed)));
}

function normalizePayload(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function assertQueueResult(result, fallbackMessage) {
  if (result?.error) {
    throw new Error(result.error.message || fallbackMessage);
  }
}

export async function enqueueAppEvent({
  actorUserId,
  dedupeKey = null,
  eventType,
  jobKind,
  payload = {},
  source = 'app',
} = {}) {
  const normalizedJobKind = normalizeValue(jobKind);
  const normalizedActorUserId = normalizeValue(actorUserId);
  const normalizedEventType = normalizeValue(eventType);

  if (!normalizedJobKind || !normalizedActorUserId || !normalizedEventType) {
    return {
      enqueued: false,
      reason: 'invalid-queue-input',
    };
  }

  const admin = createAdminClient();
  const result = await admin.rpc('enqueue_app_event', {
    p_actor_user_id: normalizedActorUserId,
    p_dedupe_key: normalizeValue(dedupeKey) || null,
    p_delay_seconds: 0,
    p_event_type: normalizedEventType,
    p_job_kind: normalizedJobKind,
    p_payload: normalizePayload(payload),
    p_source: normalizeValue(source) || 'app',
  });

  assertQueueResult(result, 'App event could not be queued');

  return {
    enqueued: true,
    messageId: result.data || null,
  };
}

async function readAppEventQueue({ limit = 10, visibilityTimeoutSeconds = 60 } = {}) {
  const admin = createAdminClient();
  const result = await admin.rpc('read_app_event_queue', {
    p_qty: normalizeLimit(limit, 10),
    p_visibility_timeout_seconds: normalizeLimit(visibilityTimeoutSeconds, 60),
  });

  assertQueueResult(result, 'App event queue could not be read');

  return Array.isArray(result.data) ? result.data : [];
}

async function completeAppEventMessage(messageId) {
  const admin = createAdminClient();
  const result = await admin.rpc('complete_app_event_queue_message', {
    p_msg_id: messageId,
  });

  assertQueueResult(result, 'App event queue message could not be completed');

  return result.data === true;
}

async function processAppEventMessage(message = {}) {
  const payload = normalizePayload(message.message);
  const jobKind = normalizeValue(payload.jobKind);
  const actorUserId = normalizeValue(payload.actorUserId);
  const eventType = normalizeValue(payload.eventType);
  const eventPayload = normalizePayload(payload.payload);

  if (jobKind === APP_EVENT_JOB_KINDS.ACTIVITY_EVENT) {
    return processActivityEvent({
      actorUserId,
      eventType,
      payload: eventPayload,
    });
  }

  if (jobKind === APP_EVENT_JOB_KINDS.NOTIFICATION_EVENT) {
    return processNotificationEvent({
      actorUserId,
      eventType,
      payload: eventPayload,
    });
  }

  throw new Error(`Unsupported app event job kind: ${jobKind || 'unknown'}`);
}

export async function drainAppEventQueue({ limit = 10, visibilityTimeoutSeconds = 60 } = {}) {
  const messages = await readAppEventQueue({
    limit,
    visibilityTimeoutSeconds,
  });
  const completed = [];
  const failed = [];

  for (const message of messages) {
    const messageId = message?.msg_id;

    if (!messageId) {
      failed.push({
        messageId: null,
        reason: 'missing-message-id',
      });
      continue;
    }

    try {
      const result = await processAppEventMessage(message);
      await completeAppEventMessage(messageId);
      completed.push({
        delivered: result?.delivered === true,
        messageId,
        reason: result?.reason || null,
      });
    } catch (error) {
      failed.push({
        messageId,
        reason: normalizeValue(error?.message) || 'app-event-processing-failed',
      });
    }
  }

  return {
    completed,
    completedCount: completed.length,
    failed,
    failedCount: failed.length,
    readCount: messages.length,
  };
}

export async function enqueueAndDrainAppEvent(options = {}) {
  let queued = null;

  try {
    queued = await enqueueAppEvent(options);
  } catch (error) {
    return {
      enqueueError: normalizeValue(error?.message) || 'app-event-enqueue-failed',
      enqueued: false,
    };
  }

  try {
    const drained = await drainAppEventQueue({
      limit: 5,
      visibilityTimeoutSeconds: 30,
    });

    return {
      ...queued,
      drained,
    };
  } catch (error) {
    return {
      ...queued,
      drainError: normalizeValue(error?.message) || 'app-event-drain-failed',
    };
  }
}
