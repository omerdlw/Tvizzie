import 'server-only';

import {
  deleteAllUserNotifications,
  deleteUserNotification,
  markAllUserNotificationsAsRead,
  markNotificationAsRead,
} from '@/core/services/notifications/notification-resources.server';
import { NOTIFICATION_TYPE_SET } from '@/core/services/notifications/notifications.constants';
import { publishUserEvent } from '@/core/services/realtime/user-events.server';
import {
  executeWriteRollout,
  getOrLoadCachedValue,
  invalidateCachedValuesWhere,
  invokeInternalEdgeFunction,
} from '@/core/services/shared/server';
import { normalizeValue } from '@/core/utils/string';
import { requireAuthenticatedRequest } from '@/core/auth/servers/session.js';
import {
  createRouteAuthMeta,
  createRouteErrorResponse,
  createRouteRequestMeta,
  createRouteSuccessResponse,
  createRouteValidationErrorResponse,
} from './route-context.server';

function resolveNotificationRolloutEndpoint(action) {
  const normalizedAction = normalizeValue(action).toLowerCase();
  return normalizedAction ? `notifications-control:${normalizedAction}` : 'notifications-control';
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
    (cacheKey) => cacheKey.startsWith('notifications|') && cacheKey.includes(`|user=${normalizedUserId}`)
  );
}

async function executeNotificationWrite({ authContext, request, requestMeta, action, notificationId = null }) {
  const normalizedAction = normalizeValue(action);
  const normalizedNotificationId = normalizeValue(notificationId);

  if (!normalizedAction) {
    throw new Error('Notification action is required');
  }

  const edgeBody = {
    action: normalizedAction,
    userId: authContext.userId,
    ...(normalizedNotificationId ? { notificationId: normalizedNotificationId } : {}),
  };

  return executeWriteRollout({
    domain: 'notifications',
    endpoint: resolveNotificationRolloutEndpoint(normalizedAction),
    logger(entry) {
      console.warn('[Rollout][notifications]', entry);
    },
    userId: authContext.userId,
    requestId: requestMeta?.requestId || null,
    edgeWrite: async () =>
      invokeInternalEdgeFunction('notifications-control', {
        body: edgeBody,
        request,
        requestMeta: createRouteAuthMeta(requestMeta, authContext),
        source: 'notifications-control',
      }),
    legacyWrite: () => executeLegacyNotificationWrite(normalizedAction, authContext.userId, normalizedNotificationId),
  });
}

async function fetchNotificationsResource({ authContext, limitCount, request, requestMeta, resource }) {
  const validTypes = [...NOTIFICATION_TYPE_SET];

  if (resource === 'unread-count') {
    const payload = await getOrLoadCachedValue({
      cacheKey: `notifications|resource=unread-count|user=${authContext.userId}`,
      enabled: true,
      ttlMs: 3000,
      loader: () =>
        invokeInternalEdgeFunction('notifications-control', {
          body: {
            action: 'unread-count',
            userId: authContext.userId,
            validTypes,
          },
          request,
          requestMeta: createRouteAuthMeta(requestMeta, authContext),
        }),
    });

    return Number(payload?.data || 0);
  }

  const payload = await getOrLoadCachedValue({
    cacheKey: `notifications|resource=list|limit=${normalizeValue(limitCount)}|user=${authContext.userId}`,
    enabled: true,
    ttlMs: 3000,
    loader: () =>
      invokeInternalEdgeFunction('notifications-control', {
        body: {
          action: 'list',
          limitCount,
          userId: authContext.userId,
          validTypes,
        },
        request,
        requestMeta: createRouteAuthMeta(requestMeta, authContext),
      }),
  });

  return Array.isArray(payload?.data) ? payload.data : [];
}

function publishNotificationChange({ authContext, notificationId = null, reason, writeResult }) {
  publishUserEvent(authContext.userId, 'notifications', {
    decision: writeResult?.decision?.mode || null,
    ...(notificationId ? { notificationId } : {}),
    reason,
    source: writeResult?.source || 'unknown',
  });
}

async function runNotificationMutation({ action, authContext, notificationId = null, request, requestMeta }) {
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
