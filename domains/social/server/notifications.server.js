import 'server-only';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/infrastructure/supabase/admin';
import { normalizeTimestamp, normalizeValue } from '@/domains/shell/shared/utils';
import {
  isSupportedContentSubjectType,
  isTvReference,
  normalizeMediaType,
} from '@/domains/media/utils/media-key';
import {
  NOTIFICATION_EVENT_TYPE_SET,
  NOTIFICATION_EVENT_TYPES,
  NOTIFICATION_TYPE_SET,
  NOTIFICATION_TYPES,
} from '@/domains/social/utils/constants';
import { publishUserEvent } from '@/infrastructure/realtime/user-events.server';
import {
  getOrLoadCachedValue,
  invalidateCachedValuesWhere,
} from '@/infrastructure/http/http-server';
import { requireAuthenticatedRequest } from '@/domains/auth/server/session.server.js';
import { assertCsrfRequestForCookieSession } from '@/domains/auth/server/security.server.js';
import {
  createRouteErrorResponse,
  createRouteRequestMeta,
  createRouteSuccessResponse,
  createRouteValidationErrorResponse,
} from '@/infrastructure/http/route-context.server';

const NOTIFICATION_LIMIT = 50;
const NOTIFICATION_SELECT = [
  'actor_user_id',
  'created_at',
  'event_type',
  'id',
  'metadata',
  'read',
].join(',');
const ACTOR_PROFILE_SELECT = ['avatar_url', 'display_name', 'email', 'username'].join(',');

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
  const subjectHref =
    subject?.href || payload?.subjectHref || list?.href || payload?.listHref || null;
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
  const client = createAdminClient();
  const resolvedLimitCount = Number.isFinite(Number(limitCount))
    ? Math.max(1, Math.min(Number(limitCount), 100))
    : NOTIFICATION_LIMIT;
  const validTypeList = Array.isArray(validTypes)
    ? validTypes
    : validTypes instanceof Set
      ? [...validTypes]
      : [];
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
  const client = createAdminClient();
  const validTypeList = Array.isArray(validTypes)
    ? validTypes
    : validTypes instanceof Set
      ? [...validTypes]
      : [];
  const result = await client
    .from('notifications')
    .select('event_type,metadata')
    .eq('user_id', userId)
    .eq('read', false)
    .in('event_type', validTypeList.length > 0 ? validTypeList : ['__none__']);

  assertResult(result, 'Unread notification count could not be loaded');

  return (result.data || [])
    .map((row) => ({
      payload:
        row?.metadata && typeof row.metadata === 'object' && row.metadata.payload
          ? row.metadata.payload
          : {},
      type: row?.event_type || 'UNKNOWN',
    }))
    .filter((notification) => isValidNotificationType(notification.type, validTypes))
    .filter(hasSupportedNotificationPayload).length;
}

export async function markNotificationAsRead(userId, notificationId) {
  const client = createAdminClient();
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
  const client = createAdminClient();
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
  const client = createAdminClient();
  const result = await client
    .from('notifications')
    .delete()
    .eq('user_id', userId)
    .eq('id', notificationId);

  assertResult(result, 'Notification could not be deleted');
}

export async function deleteAllUserNotifications(userId) {
  const client = createAdminClient();
  const result = await client.from('notifications').delete().eq('user_id', userId);

  assertResult(result, 'Notifications could not be deleted');
}

function createActorSnapshot(userId, profile = {}) {
  return {
    avatarUrl: profile?.avatar_url || null,
    displayName: profile?.display_name || profile?.name || profile?.email || 'Someone',
    id: userId || null,
    username: profile?.username || null,
  };
}

function buildSubject(payload = {}) {
  const subjectType = normalizeValue(payload.subjectType).toLowerCase();
  const subjectId = normalizeValue(payload.subjectId);
  const subjectTitle = normalizeValue(payload.subjectTitle) || 'Untitled';

  if (subjectType === 'list') {
    const ownerUsername = normalizeValue(payload.subjectOwnerUsername || payload.ownerUsername);
    const slug = normalizeValue(
      payload.subjectSlug || payload.listSlug || payload.listId || subjectId,
    );

    return {
      href: ownerUsername && slug ? `/account/${ownerUsername}/lists/${slug}` : null,
      id: subjectId || normalizeValue(payload.listId),
      ownerId: normalizeValue(payload.subjectOwnerId || payload.listOwnerId) || null,
      ownerUsername: ownerUsername || null,
      slug: slug || null,
      title: normalizeValue(payload.listTitle || subjectTitle) || 'Untitled List',
      type: 'list',
    };
  }

  if (subjectType === 'user') {
    const username = normalizeValue(payload.subjectUsername);

    return {
      href: username ? `/account/${username}` : null,
      id: subjectId || normalizeValue(payload.subjectUserId) || null,
      ownerId: null,
      ownerUsername: username || null,
      slug: null,
      title: normalizeValue(payload.subjectDisplayName || subjectTitle) || 'Account',
      type: 'user',
    };
  }

  return {
    href: subjectType && subjectId ? `/${subjectType}/${subjectId}` : null,
    id: subjectId || null,
    ownerId: null,
    ownerUsername: null,
    slug: null,
    title: subjectTitle,
    type: subjectType || null,
  };
}

function mapEventToNotification(eventType, payload = {}, actor = {}) {
  if (eventType === NOTIFICATION_EVENT_TYPES.FOLLOW_CREATED) {
    const targetUserId = normalizeValue(payload.followingId);

    if (!targetUserId) {
      return null;
    }

    const status = normalizeValue(payload.status).toLowerCase();

    return {
      body: '',
      eventType:
        status === 'pending' ? NOTIFICATION_TYPES.FOLLOW_REQUEST : NOTIFICATION_TYPES.NEW_FOLLOWER,
      href: actor?.username ? `/account/${actor.username}` : null,
      userId: targetUserId,
    };
  }

  if (eventType === NOTIFICATION_EVENT_TYPES.FOLLOW_ACCEPTED) {
    const requesterId = normalizeValue(payload.requesterId);

    if (!requesterId) {
      return null;
    }

    return {
      body: '',
      eventType: NOTIFICATION_TYPES.FOLLOW_ACCEPTED,
      href: actor?.username ? `/account/${actor.username}` : null,
      userId: requesterId,
    };
  }

  if (eventType === NOTIFICATION_EVENT_TYPES.REVIEW_LIKED) {
    const reviewOwnerId = normalizeValue(payload.reviewOwnerId);

    if (!reviewOwnerId) {
      return null;
    }

    const subject = buildSubject(payload);

    return {
      body: '',
      eventType: NOTIFICATION_TYPES.REVIEW_LIKE,
      href: subject.href || null,
      userId: reviewOwnerId,
    };
  }

  if (eventType === NOTIFICATION_EVENT_TYPES.LIST_LIKED) {
    const listOwnerId = normalizeValue(payload.listOwnerId);

    if (!listOwnerId) {
      return null;
    }

    const subject = buildSubject({
      ...payload,
      subjectId: payload.listId || payload.subjectId,
      subjectType: 'list',
    });

    return {
      body: '',
      eventType: NOTIFICATION_TYPES.LIST_LIKE,
      href: subject.href || null,
      userId: listOwnerId,
    };
  }

  if (eventType === NOTIFICATION_EVENT_TYPES.LIST_COMMENTED) {
    const listOwnerId = normalizeValue(
      payload.listOwnerId || payload.subjectOwnerId || payload.ownerId,
    );

    if (!listOwnerId) {
      return null;
    }

    const subject = buildSubject({
      ...payload,
      subjectId: payload.listId || payload.subjectId,
      subjectType: 'list',
    });

    return {
      body: '',
      eventType: NOTIFICATION_TYPES.LIST_COMMENT,
      href: subject.href || null,
      userId: listOwnerId,
    };
  }

  return null;
}

function resolveNotificationSubject(eventType, payload = {}) {
  if (
    eventType === NOTIFICATION_EVENT_TYPES.LIST_LIKED ||
    eventType === NOTIFICATION_EVENT_TYPES.LIST_COMMENTED
  ) {
    return buildSubject({
      ...payload,
      subjectId: payload.listId || payload.subjectId,
      subjectType: 'list',
    });
  }

  return buildSubject(payload);
}

async function getUserProfile(admin, userId) {
  const normalizedUserId = normalizeValue(userId);

  if (!normalizedUserId) {
    return null;
  }

  const result = await admin
    .from('profiles')
    .select(ACTOR_PROFILE_SELECT)
    .eq('id', normalizedUserId)
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message || 'Actor profile could not be loaded');
  }

  return result.data || null;
}

export async function processNotificationEvent({ actorUserId, eventType, payload = {} }) {
  const normalizedActorUserId = normalizeValue(actorUserId);
  const normalizedEventType = normalizeValue(eventType);

  if (!normalizedActorUserId || !normalizedEventType) {
    return { delivered: false, reason: 'invalid-event-input' };
  }

  if (!NOTIFICATION_EVENT_TYPE_SET.has(normalizedEventType)) {
    return { delivered: false, reason: 'unsupported-event-type' };
  }

  const admin = createAdminClient();
  const actorProfile = await getUserProfile(admin, normalizedActorUserId);
  const actor = createActorSnapshot(normalizedActorUserId, actorProfile || {});
  const mapped = mapEventToNotification(normalizedEventType, payload, actor);

  if (!mapped || !mapped.userId || mapped.userId === normalizedActorUserId) {
    return {
      delivered: false,
      reason: 'notification-target-missing',
    };
  }

  const nowIso = new Date().toISOString();
  const subject = resolveNotificationSubject(normalizedEventType, payload);
  const title = `${actor.displayName} sent an update`;

  const result = await admin.from('notifications').insert({
    user_id: mapped.userId,
    actor_user_id: normalizedActorUserId,
    event_type: mapped.eventType,
    title,
    body: mapped.body || '',
    href: mapped.href || null,
    metadata: {
      actor,
      payload: {
        ...payload,
        subject,
      },
    },
    read: false,
    created_at: nowIso,
    updated_at: nowIso,
  });

  if (result.error) {
    throw new Error(result.error.message || 'Notification could not be created');
  }

  publishUserEvent(mapped.userId, 'notifications', {
    reason: 'created',
  });

  return {
    delivered: true,
  };
}

function createValidationErrorResponse({ authContext, message, requestMeta }) {
  return createRouteValidationErrorResponse({
    authContext,
    message,
    requestMeta,
  });
}

function createNotificationErrorResponse({ code, error, fallbackMessage, requestMeta }) {
  return createRouteErrorResponse({
    code,
    error,
    fallbackMessage,
    requestMeta,
    clientErrorPatterns: ['invalid', 'required', 'unsupported', 'not found'],
  });
}

function createNotificationSuccessResponse({ authContext, payload, requestMeta }) {
  return createRouteSuccessResponse({
    authContext,
    payload,
    requestMeta,
    legacyPayload: payload?.success === true ? { success: true } : payload,
  });
}

const LEGACY_NOTIFICATION_ACTIONS = Object.freeze({
  delete: ({ userId, notificationId }) => deleteUserNotification(userId, notificationId),
  'delete-all': ({ userId }) => deleteAllUserNotifications(userId),
  'mark-all-read': ({ userId }) => markAllUserNotificationsAsRead(userId),
  'mark-read': ({ userId, notificationId }) => markNotificationAsRead(userId, notificationId),
});

async function executeLegacyNotificationWrite(action, userId, notificationId) {
  const handler = LEGACY_NOTIFICATION_ACTIONS[action];

  if (typeof handler !== 'function') {
    throw new Error('Unsupported notifications action');
  }

  await handler({
    notificationId,
    userId,
  });

  return {
    success: true,
  };
}

function invalidateNotificationCaches(userId) {
  const normalizedUserId = normalizeValue(userId);

  if (!normalizedUserId) {
    return;
  }

  invalidateCachedValuesWhere(
    (cacheKey) =>
      cacheKey.startsWith('notifications|') && cacheKey.includes(`|user=${normalizedUserId}`),
  );
}

async function executeNotificationWrite({
  authContext,
  action,
  notificationId = null,
}) {
  const normalizedAction = normalizeValue(action);
  const normalizedNotificationId = normalizeValue(notificationId);

  if (!normalizedAction) {
    throw new Error('Notification action is required');
  }

  return executeLegacyNotificationWrite(
    normalizedAction,
    authContext.userId,
    normalizedNotificationId,
  );
}

async function fetchNotificationsResource({
  authContext,
  limitCount,
  resource,
}) {
  const validTypes = [...NOTIFICATION_TYPE_SET];

  if (resource === 'unread-count') {
    const count = await getOrLoadCachedValue({
      cacheKey: `notifications|resource=unread-count|user=${authContext.userId}`,
      enabled: true,
      ttlMs: 3000,
      loader: () => getUnreadNotificationCount(authContext.userId, validTypes),
    });

    return Number(count || 0);
  }

  const list = await getOrLoadCachedValue({
    cacheKey: `notifications|resource=list|limit=${normalizeValue(limitCount)}|user=${authContext.userId}`,
    enabled: true,
    ttlMs: 3000,
    loader: () => getNotificationList(authContext.userId, validTypes, limitCount),
  });

  return Array.isArray(list) ? list : [];
}

function publishNotificationChange({ authContext, notificationId = null, reason, writeResult }) {
  publishUserEvent(authContext.userId, 'notifications', {
    decision: writeResult?.decision?.mode || null,
    ...(notificationId ? { notificationId } : {}),
    reason,
    source: writeResult?.source || 'unknown',
  });
}

async function runNotificationMutation({
  action,
  authContext,
  notificationId = null,
  request,
  requestMeta,
}) {
  const writeResult = await executeNotificationWrite({
    action,
    authContext,
    notificationId,
    request,
    requestMeta,
  });

  invalidateNotificationCaches(authContext.userId);
  publishNotificationChange({
    authContext,
    notificationId,
    reason: action,
    writeResult,
  });

  return createNotificationSuccessResponse({
    authContext,
    payload: {
      decision: writeResult?.decision || null,
      source: writeResult?.source || 'unknown',
      success: true,
    },
    requestMeta,
  });
}

export async function handleNotificationsGet(request) {
  const requestMeta = createRouteRequestMeta(request, 'api/notifications:get');

  try {
    const authContext = await requireAuthenticatedRequest(request);
    const { searchParams } = new URL(request.url);
    const resource = normalizeValue(searchParams.get('resource'));
    const limitCount = searchParams.get('limitCount');
    const data = await fetchNotificationsResource({
      authContext,
      limitCount,
      request,
      requestMeta,
      resource,
    });

    return createNotificationSuccessResponse({
      authContext,
      payload: {
        data,
      },
      requestMeta,
    });
  } catch (error) {
    return createNotificationErrorResponse({
      code: 'NOTIFICATIONS_FETCH_FAILED',
      error,
      fallbackMessage: 'Notifications could not be loaded',
      requestMeta,
    });
  }
}

export async function handleNotificationsPatch(request) {
  const requestMeta = createRouteRequestMeta(request, 'api/notifications:patch');

  try {
    assertCsrfRequestForCookieSession(request);
    const authContext = await requireAuthenticatedRequest(request);
    const body = await request.json().catch(() => ({}));
    const action = normalizeValue(body?.action);
    const notificationId = normalizeValue(body?.notificationId);

    if (action === 'mark-all-read') {
      return runNotificationMutation({
        action: 'mark-all-read',
        authContext,
        request,
        requestMeta,
      });
    }

    if (!notificationId) {
      return createValidationErrorResponse({
        authContext,
        message: 'notificationId is required',
        requestMeta,
      });
    }

    return runNotificationMutation({
      action: 'mark-read',
      authContext,
      notificationId,
      request,
      requestMeta,
    });
  } catch (error) {
    return createNotificationErrorResponse({
      code: 'NOTIFICATIONS_UPDATE_FAILED',
      error,
      fallbackMessage: 'Notification update failed',
      requestMeta,
    });
  }
}

export async function handleNotificationsDelete(request) {
  const requestMeta = createRouteRequestMeta(request, 'api/notifications:delete');

  try {
    assertCsrfRequestForCookieSession(request);
    const authContext = await requireAuthenticatedRequest(request);
    const { searchParams } = new URL(request.url);
    const action = normalizeValue(searchParams.get('action'));
    const notificationId = normalizeValue(searchParams.get('notificationId'));

    if (action === 'delete-all') {
      return runNotificationMutation({
        action: 'delete-all',
        authContext,
        request,
        requestMeta,
      });
    }

    if (!notificationId) {
      return createValidationErrorResponse({
        authContext,
        message: 'notificationId is required',
        requestMeta,
      });
    }

    return runNotificationMutation({
      action: 'delete',
      authContext,
      notificationId,
      request,
      requestMeta,
    });
  } catch (error) {
    return createNotificationErrorResponse({
      code: 'NOTIFICATIONS_DELETE_FAILED',
      error,
      fallbackMessage: 'Notification delete failed',
      requestMeta,
    });
  }
}

export async function handleNotificationsEventPost(request) {
  try {
    assertCsrfRequestForCookieSession(request);
    const authContext = await requireAuthenticatedRequest(request);
    const body = await request.json().catch(() => ({}));

    const eventType = normalizeValue(body?.eventType);
    const payload = body?.payload && typeof body.payload === 'object' ? body.payload : {};

    const result = await processNotificationEvent({
      actorUserId: authContext.userId,
      eventType,
      payload,
    });

    return NextResponse.json({
      delivered: result?.delivered === true,
      reason: result?.reason || null,
    });
  } catch (error) {
    const message = normalizeValue(error?.message || 'Notification event failed');
    const status = message.includes('Authentication') ? 401 : message.includes('invalid') ? 400 : 500;

    return NextResponse.json(
      {
        error: message,
      },
      {
        status,
      },
    );
  }
}

export {
  handleNotificationsGet as GET,
  handleNotificationsPatch as PATCH,
  handleNotificationsDelete as DELETE,
};
