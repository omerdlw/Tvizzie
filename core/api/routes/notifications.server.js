import 'server-only';

import { requireAuthenticatedRequest } from '@/core/auth/servers/session.js';
import {
  deleteAllUserNotifications,
  deleteUserNotification,
  markAllUserNotificationsAsRead,
  markNotificationAsRead,
} from '@/core/services/notifications/notification-resources.server';
import { NOTIFICATION_TYPE_SET } from '@/core/services/notifications/notifications.constants';
import { publishUserEvent } from '@/core/services/realtime/user-events.server';
import { createApiErrorResponse, createApiSuccessResponse } from '@/core/services/shared';
import { getOrLoadCachedValue, invalidateCachedValuesWhere } from '@/core/services/shared';
import { buildInternalRequestMeta } from '@/core/services/shared';
import { invokeInternalEdgeFunction } from '@/core/services/shared';
import { executeWriteRollout } from '@/core/services/shared';

function normalizeValue(value) {
  return String(value || '').trim();
}

function resolveNotificationRolloutEndpoint(action) {
  const normalizedAction = normalizeValue(action).toLowerCase();
  return normalizedAction ? `notifications-control:${normalizedAction}` : 'notifications-control';
}

function createRequestMeta(request, source) {
  return buildInternalRequestMeta({
    request,
    source,
  });
}

function createAuthenticatedRequestMeta(requestMeta, authContext) {
  return {
    ...requestMeta,
    sessionId: authContext.sessionJti,
    userId: authContext.userId,
  };
}

function createValidationErrorResponse({ authContext, message, requestMeta }) {
  return createApiErrorResponse(
    {
      code: 'VALIDATION_ERROR',
      message,
    },
    {
      requestMeta: createAuthenticatedRequestMeta(requestMeta, authContext),
      status: 400,
    }
  );
}

function createNotificationErrorResponse({ code, error, fallbackMessage, requestMeta }) {
  const message = String(error?.message || fallbackMessage);
  const status = message.includes('Authentication session is required')
    ? 401
    : Number.isFinite(Number(error?.status))
      ? Number(error.status)
      : 500;

  return createApiErrorResponse(
    {
      code: status === 401 ? 'UNAUTHORIZED' : code,
      message,
    },
    {
      requestMeta,
      status,
    }
  );
}

function createNotificationSuccessResponse({ authContext, payload, requestMeta }) {
  return createApiSuccessResponse(payload, {
    legacyPayload: payload?.success === true ? { success: true } : payload,
    requestMeta: createAuthenticatedRequestMeta(requestMeta, authContext),
  });
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
        requestMeta: createAuthenticatedRequestMeta(requestMeta, authContext),
        source: 'notifications-control',
      }),
    legacyWrite: async () => {
      if (normalizedAction === 'mark-all-read') {
        await markAllUserNotificationsAsRead(authContext.userId);
        return {
          success: true,
        };
      }

      if (normalizedAction === 'mark-read') {
        await markNotificationAsRead(authContext.userId, normalizedNotificationId);
        return {
          success: true,
        };
      }

      if (normalizedAction === 'delete') {
        await deleteUserNotification(authContext.userId, normalizedNotificationId);
        return {
          success: true,
        };
      }

      if (normalizedAction === 'delete-all') {
        await deleteAllUserNotifications(authContext.userId);
        return {
          success: true,
        };
      }

      throw new Error('Unsupported notifications action');
    },
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
          requestMeta: createAuthenticatedRequestMeta(requestMeta, authContext),
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
        requestMeta: createAuthenticatedRequestMeta(requestMeta, authContext),
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
  const requestMeta = createRequestMeta(request, 'api/notifications:get');

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
  const requestMeta = createRequestMeta(request, 'api/notifications:patch');

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
  const requestMeta = createRequestMeta(request, 'api/notifications:delete');

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
