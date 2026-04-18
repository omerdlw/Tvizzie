import 'server-only';

import { createClient as createServerClient } from '@/core/clients/supabase/server';
import { normalizeTimestamp } from '@/core/services/shared/data-utils';
import { isSupportedContentSubjectType, isTvReference, normalizeMediaType } from '@/core/utils/media';

const NOTIFICATION_LIMIT = 50;
const NOTIFICATION_SELECT = ['actor_user_id', 'created_at', 'event_type', 'id', 'metadata', 'read'].join(',');

function assertResult(result, fallbackMessage) {
  if (result?.error) {
    throw new Error(result.error.message || fallbackMessage);
  }

  return result;
}

function isValidNotificationType(type, validTypes) {
  return validTypes.has(type);
}

function normalizeNotificationRow(row = {}) {
  const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  const actor = metadata.actor && typeof metadata.actor === 'object' ? metadata.actor : {};

  return {
    actor: {
      avatarUrl: actor.avatarUrl || actor.avatar_url || null,
      displayName: actor.displayName || actor.display_name || 'Someone',
      id: actor.id || row.actor_user_id || null,
      username: actor.username || null,
    },
    createdAt: normalizeTimestamp(row.created_at),
    id: row.id,
    payload: metadata.payload && typeof metadata.payload === 'object' ? metadata.payload : {},
    read: row.read === true,
    type: row.event_type || 'UNKNOWN',
  };
}

function hasSupportedNotificationPayload(notification = {}) {
  const payload = notification?.payload || {};
  const subject = payload?.subject && typeof payload.subject === 'object' ? payload.subject : null;
  const list = payload?.list && typeof payload.list === 'object' ? payload.list : null;
  const subjectHref = subject?.href || payload?.subjectHref || list?.href || payload?.listHref || null;
  const subjectType = normalizeMediaType(subject?.type || payload?.subjectType || list?.type);

  if (subjectHref && isTvReference(subjectHref)) {
    return false;
  }

  if (!subjectType) {
    return true;
  }

  return isSupportedContentSubjectType(subjectType);
}

export async function getNotificationList(userId, validTypes, limitCount = NOTIFICATION_LIMIT) {
  const client = await createServerClient();
  const resolvedLimitCount = Number.isFinite(Number(limitCount))
    ? Math.max(1, Math.min(Number(limitCount), 100))
    : NOTIFICATION_LIMIT;
  const validTypeList = Array.isArray(validTypes) ? validTypes : validTypes instanceof Set ? [...validTypes] : [];
  const result = await client
    .from('notifications')
    .select(NOTIFICATION_SELECT)
    .eq('user_id', userId)
    .in('event_type', validTypeList.length > 0 ? validTypeList : ['__none__'])
    .order('created_at', { ascending: false })
    .limit(resolvedLimitCount);

  assertResult(result, 'Notifications could not be loaded');

  return (result.data || [])
    .map(normalizeNotificationRow)
    .filter((notification) => isValidNotificationType(notification.type, validTypes))
    .filter(hasSupportedNotificationPayload);
}

export async function getUnreadNotificationCount(userId, validTypes) {
  const client = await createServerClient();
  const validTypeList = Array.isArray(validTypes) ? validTypes : validTypes instanceof Set ? [...validTypes] : [];
  const result = await client
    .from('notifications')
    .select('event_type,metadata')
    .eq('user_id', userId)
    .eq('read', false)
    .in('event_type', validTypeList.length > 0 ? validTypeList : ['__none__']);

  assertResult(result, 'Unread notification count could not be loaded');

  return (result.data || [])
    .map((row) => ({
      payload: row?.metadata && typeof row.metadata === 'object' && row.metadata.payload ? row.metadata.payload : {},
      type: row?.event_type || 'UNKNOWN',
    }))
    .filter((notification) => isValidNotificationType(notification.type, validTypes))
    .filter(hasSupportedNotificationPayload).length;
}

export async function markNotificationAsRead(userId, notificationId) {
  const client = await createServerClient();
  const timestamp = new Date().toISOString();
  const result = await client
    .from('notifications')
    .update({
      read: true,
      read_at: timestamp,
      updated_at: timestamp,
    })
    .eq('user_id', userId)
    .eq('id', notificationId);

  assertResult(result, 'Notification could not be marked as read');
}

export async function markAllUserNotificationsAsRead(userId) {
  const client = await createServerClient();
  const timestamp = new Date().toISOString();
  const result = await client
    .from('notifications')
    .update({
      read: true,
      read_at: timestamp,
      updated_at: timestamp,
    })
    .eq('user_id', userId)
    .eq('read', false);

  assertResult(result, 'Notifications could not be marked as read');
}

export async function deleteUserNotification(userId, notificationId) {
  const client = await createServerClient();
  const result = await client.from('notifications').delete().eq('user_id', userId).eq('id', notificationId);

  assertResult(result, 'Notification could not be deleted');
}

export async function deleteAllUserNotifications(userId) {
  const client = await createServerClient();
  const result = await client.from('notifications').delete().eq('user_id', userId);

  assertResult(result, 'Notifications could not be deleted');
}
