import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import {
  assertInternalAccess,
  assertMethod,
  assertResult,
  createAdminClient,
  errorResponse,
  isSupportedContentSubjectType,
  isTvReference,
  jsonResponse,
  mapErrorToStatus,
  normalizeMediaType,
  normalizeTimestamp,
  normalizeTrim,
  readJsonBody,
  resolveLimitCount,
} from '../_internal/common.ts';

type NotificationsControlAction = 'list' | 'unread-count' | 'mark-read' | 'mark-all-read' | 'delete';

type NotificationsControlRequest = {
  action?: NotificationsControlAction;
  limitCount?: number | string | null;
  notificationId?: string | null;
  userId?: string;
  validTypes?: string[] | null;
};

const NOTIFICATION_LIMIT = 50;
const NOTIFICATION_SELECT = ['actor_user_id', 'created_at', 'event_type', 'id', 'metadata', 'read'].join(',');

function normalizeAction(value: unknown): NotificationsControlAction {
  const normalized = normalizeTrim(value).toLowerCase();

  if (
    normalized === 'list' ||
    normalized === 'unread-count' ||
    normalized === 'mark-read' ||
    normalized === 'mark-all-read' ||
    normalized === 'delete'
  ) {
    return normalized;
  }

  throw new Error('action must be one of: list, unread-count, mark-read, mark-all-read, delete');
}

function normalizeValidTypes(value: unknown): Set<string> {
  if (!Array.isArray(value)) {
    return new Set();
  }

  return new Set(value.map((item) => normalizeTrim(item)).filter(Boolean));
}

function isValidNotificationType(type: unknown, validTypes: Set<string>): boolean {
  if (!(validTypes instanceof Set) || validTypes.size === 0) {
    return true;
  }

  return validTypes.has(normalizeTrim(type));
}

function normalizeNotificationRow(row: Record<string, unknown>) {
  const metadata = row.metadata && typeof row.metadata === 'object' ? (row.metadata as Record<string, unknown>) : {};
  const actor = metadata.actor && typeof metadata.actor === 'object' ? (metadata.actor as Record<string, unknown>) : {};

  return {
    actor: {
      avatarUrl: normalizeTrim(actor.avatarUrl || actor.avatar_url) || null,
      displayName: normalizeTrim(actor.displayName || actor.display_name) || 'Someone',
      id: normalizeTrim(actor.id || row.actor_user_id) || null,
      username: normalizeTrim(actor.username) || null,
    },
    createdAt: normalizeTimestamp(row.created_at),
    id: normalizeTrim(row.id) || null,
    payload:
      metadata.payload && typeof metadata.payload === 'object' ? (metadata.payload as Record<string, unknown>) : {},
    read: row.read === true,
    type: normalizeTrim(row.event_type) || 'UNKNOWN',
  };
}

function hasSupportedNotificationPayload(
  notification: {
    payload?: Record<string, unknown>;
  } = {}
): boolean {
  const payload = notification.payload || {};
  const subject =
    payload.subject && typeof payload.subject === 'object' ? (payload.subject as Record<string, unknown>) : null;
  const list = payload.list && typeof payload.list === 'object' ? (payload.list as Record<string, unknown>) : null;
  const subjectHref =
    normalizeTrim(subject?.href) ||
    normalizeTrim(payload.subjectHref) ||
    normalizeTrim(list?.href) ||
    normalizeTrim(payload.listHref) ||
    null;
  const subjectType = normalizeMediaType(subject?.type || payload.subjectType || list?.type);

  if (subjectHref && isTvReference(subjectHref)) {
    return false;
  }

  if (!subjectType) {
    return true;
  }

  return isSupportedContentSubjectType(subjectType);
}

Deno.serve(async (request: Request) => {
  try {
    assertMethod(request, ['POST']);
    assertInternalAccess(request);

    const payload = await readJsonBody<NotificationsControlRequest>(request);
    const action = normalizeAction(payload.action);
    const userId = normalizeTrim(payload.userId);
    const validTypes = normalizeValidTypes(payload.validTypes);

    if (!userId) {
      throw new Error('userId is required');
    }

    const admin = createAdminClient();

    if (action === 'list') {
      const limitCount = resolveLimitCount(payload.limitCount, NOTIFICATION_LIMIT, 100);
      const typeFilter = [...validTypes];
      let query = admin
        .from('notifications')
        .select(NOTIFICATION_SELECT)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limitCount);

      if (typeFilter.length > 0) {
        query = query.in('event_type', typeFilter);
      }

      const result = await query;
      assertResult(result, 'Notifications could not be loaded');

      const items = (result.data || [])
        .map((row) => normalizeNotificationRow(row as Record<string, unknown>))
        .filter((item) => isValidNotificationType(item.type, validTypes))
        .filter((item) => hasSupportedNotificationPayload(item));

      return jsonResponse(200, {
        action,
        data: items,
        ok: true,
      });
    }

    if (action === 'unread-count') {
      const typeFilter = [...validTypes];
      let query = admin.from('notifications').select('event_type,metadata').eq('user_id', userId).eq('read', false);

      if (typeFilter.length > 0) {
        query = query.in('event_type', typeFilter);
      }

      const result = await query;
      assertResult(result, 'Unread notification count could not be loaded');

      const data = (result.data || [])
        .map((row) => {
          const normalized = row as Record<string, unknown>;
          const metadata =
            normalized.metadata && typeof normalized.metadata === 'object'
              ? (normalized.metadata as Record<string, unknown>)
              : {};

          return {
            payload:
              metadata.payload && typeof metadata.payload === 'object'
                ? (metadata.payload as Record<string, unknown>)
                : {},
            type: normalizeTrim(normalized.event_type) || 'UNKNOWN',
          };
        })
        .filter((item) => isValidNotificationType(item.type, validTypes))
        .filter((item) => hasSupportedNotificationPayload(item));

      return jsonResponse(200, {
        action,
        data: data.length,
        ok: true,
      });
    }

    if (action === 'mark-all-read') {
      const nowIso = new Date().toISOString();
      const result = await admin
        .from('notifications')
        .update({
          read: true,
          read_at: nowIso,
          updated_at: nowIso,
        })
        .eq('user_id', userId)
        .eq('read', false);

      assertResult(result, 'Notifications could not be marked as read');

      return jsonResponse(200, {
        action,
        ok: true,
        success: true,
      });
    }

    const notificationId = normalizeTrim(payload.notificationId);

    if (!notificationId) {
      throw new Error('notificationId is required');
    }

    if (action === 'mark-read') {
      const nowIso = new Date().toISOString();
      const result = await admin
        .from('notifications')
        .update({
          read: true,
          read_at: nowIso,
          updated_at: nowIso,
        })
        .eq('user_id', userId)
        .eq('id', notificationId);

      assertResult(result, 'Notification could not be marked as read');

      return jsonResponse(200, {
        action,
        ok: true,
        success: true,
      });
    }

    const deleteResult = await admin.from('notifications').delete().eq('user_id', userId).eq('id', notificationId);

    assertResult(deleteResult, 'Notification could not be deleted');

    return jsonResponse(200, {
      action,
      ok: true,
      success: true,
    });
  } catch (error) {
    return errorResponse(mapErrorToStatus(error), String((error as Error)?.message || 'notifications-control failed'));
  }
});
