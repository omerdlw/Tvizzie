import { requireAuthenticatedRequest } from '@/core/auth/servers/session/authenticated-request.server';
import {
  deleteAllUserNotifications,
  deleteUserNotification,
  markAllUserNotificationsAsRead,
  markNotificationAsRead,
} from '@/core/services/browser/browser-data.server';
import { createApiErrorResponse, createApiSuccessResponse } from '@/core/services/shared/api-response.server';
import { buildInternalRequestMeta } from '@/core/services/shared/request-meta.server';
import { publishUserEvent } from '@/core/services/realtime/user-events.server';
import { invokeInternalEdgeFunction } from '@/core/services/shared/supabase-edge-internal.server';
import { executeWriteRollout } from '@/core/services/shared/write-rollout.server';
import {
  getOrLoadCachedValue,
  invalidateCachedValuesWhere,
} from '@/core/services/shared/memory-cache.server';
import { NOTIFICATION_TYPE_SET } from '@/core/services/notifications/notifications.constants';

function normalizeValue(value) {
  return String(value || '').trim();
}

function resolveNotificationRolloutEndpoint(action) {
  const normalizedAction = normalizeValue(action).toLowerCase();
  return normalizedAction ? `notifications-control:${normalizedAction}` : 'notifications-control';
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

async function executeNotificationWrite({
  authContext,
  request,
  requestMeta,
  action,
  notificationId = null,
}) {
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
        requestMeta: {
          ...requestMeta,
          sessionId: authContext.sessionJti,
          userId: authContext.userId,
        },
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

export async function GET(request) {
  const requestMeta = buildInternalRequestMeta({
    request,
    source: 'api/notifications:get',
  });
  try {
    const authContext = await requireAuthenticatedRequest(request);
    const { searchParams } = new URL(request.url);
    const resource = normalizeValue(searchParams.get('resource'));
    const limitCount = searchParams.get('limitCount');
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
            requestMeta: {
              ...requestMeta,
              sessionId: authContext.sessionJti,
              userId: authContext.userId,
            },
          }),
      });
      const data = Number(payload?.data || 0);

      return createApiSuccessResponse(
        {
          data,
        },
        {
          legacyPayload: {
            data,
          },
          requestMeta: {
            ...requestMeta,
            sessionId: authContext.sessionJti,
            userId: authContext.userId,
          },
        }
      );
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
          requestMeta: {
            ...requestMeta,
            sessionId: authContext.sessionJti,
            userId: authContext.userId,
          },
        }),
    });
    const data = Array.isArray(payload?.data) ? payload.data : [];

    return createApiSuccessResponse(
      {
        data,
      },
      {
        legacyPayload: {
          data,
        },
        requestMeta: {
          ...requestMeta,
          sessionId: authContext.sessionJti,
          userId: authContext.userId,
        },
      }
    );
  } catch (error) {
    const message = String(error?.message || 'Notifications could not be loaded');
    const status = message.includes('Authentication session is required')
      ? 401
      : Number.isFinite(Number(error?.status))
        ? Number(error.status)
        : 500;

    return createApiErrorResponse(
      {
        code: status === 401 ? 'UNAUTHORIZED' : 'NOTIFICATIONS_FETCH_FAILED',
        message,
      },
      {
        requestMeta,
        status,
      }
    );
  }
}

export async function PATCH(request) {
  const requestMeta = buildInternalRequestMeta({
    request,
    source: 'api/notifications:patch',
  });
  try {
    const authContext = await requireAuthenticatedRequest(request);
    const body = await request.json().catch(() => ({}));
    const action = normalizeValue(body?.action);
    const notificationId = normalizeValue(body?.notificationId);

    if (action === 'mark-all-read') {
      const writeResult = await executeNotificationWrite({
        action: 'mark-all-read',
        authContext,
        request,
        requestMeta,
      });
      invalidateNotificationCaches(authContext.userId);
      publishUserEvent(authContext.userId, 'notifications', {
        decision: writeResult?.decision?.mode || null,
        reason: 'mark-all-read',
        source: writeResult?.source || 'unknown',
      });
      return createApiSuccessResponse(
        {
          decision: writeResult?.decision || null,
          source: writeResult?.source || 'unknown',
          success: true,
        },
        {
          legacyPayload: {
            success: true,
          },
          requestMeta: {
            ...requestMeta,
            sessionId: authContext.sessionJti,
            userId: authContext.userId,
          },
        }
      );
    }

    if (!notificationId) {
      return createApiErrorResponse(
        {
          code: 'VALIDATION_ERROR',
          message: 'notificationId is required',
        },
        {
          requestMeta: {
            ...requestMeta,
            sessionId: authContext.sessionJti,
            userId: authContext.userId,
          },
          status: 400,
        }
      );
    }

    const writeResult = await executeNotificationWrite({
      action: 'mark-read',
      authContext,
      notificationId,
      request,
      requestMeta,
    });
    invalidateNotificationCaches(authContext.userId);
    publishUserEvent(authContext.userId, 'notifications', {
      decision: writeResult?.decision?.mode || null,
      notificationId,
      reason: 'mark-read',
      source: writeResult?.source || 'unknown',
    });
    return createApiSuccessResponse(
      {
        decision: writeResult?.decision || null,
        source: writeResult?.source || 'unknown',
        success: true,
      },
      {
        legacyPayload: {
          success: true,
        },
        requestMeta: {
          ...requestMeta,
          sessionId: authContext.sessionJti,
          userId: authContext.userId,
        },
      }
    );
  } catch (error) {
    const message = String(error?.message || 'Notification update failed');
    const status = message.includes('Authentication session is required')
      ? 401
      : Number.isFinite(Number(error?.status))
        ? Number(error.status)
        : 500;

    return createApiErrorResponse(
      {
        code: status === 401 ? 'UNAUTHORIZED' : 'NOTIFICATIONS_UPDATE_FAILED',
        message,
      },
      {
        requestMeta,
        status,
      }
    );
  }
}

export async function DELETE(request) {
  const requestMeta = buildInternalRequestMeta({
    request,
    source: 'api/notifications:delete',
  });
  try {
    const authContext = await requireAuthenticatedRequest(request);
    const { searchParams } = new URL(request.url);
    const action = normalizeValue(searchParams.get('action'));
    const notificationId = normalizeValue(searchParams.get('notificationId'));

    if (action === 'delete-all') {
      const writeResult = await executeNotificationWrite({
        action: 'delete-all',
        authContext,
        request,
        requestMeta,
      });
      invalidateNotificationCaches(authContext.userId);
      publishUserEvent(authContext.userId, 'notifications', {
        decision: writeResult?.decision?.mode || null,
        reason: 'delete-all',
        source: writeResult?.source || 'unknown',
      });
      return createApiSuccessResponse(
        {
          decision: writeResult?.decision || null,
          source: writeResult?.source || 'unknown',
          success: true,
        },
        {
          legacyPayload: {
            success: true,
          },
          requestMeta: {
            ...requestMeta,
            sessionId: authContext.sessionJti,
            userId: authContext.userId,
          },
        }
      );
    }

    if (!notificationId) {
      return createApiErrorResponse(
        {
          code: 'VALIDATION_ERROR',
          message: 'notificationId is required',
        },
        {
          requestMeta: {
            ...requestMeta,
            sessionId: authContext.sessionJti,
            userId: authContext.userId,
          },
          status: 400,
        }
      );
    }

    const writeResult = await executeNotificationWrite({
      action: 'delete',
      authContext,
      notificationId,
      request,
      requestMeta,
    });
    invalidateNotificationCaches(authContext.userId);
    publishUserEvent(authContext.userId, 'notifications', {
      decision: writeResult?.decision?.mode || null,
      notificationId,
      reason: 'delete',
      source: writeResult?.source || 'unknown',
    });
    return createApiSuccessResponse(
      {
        decision: writeResult?.decision || null,
        source: writeResult?.source || 'unknown',
        success: true,
      },
      {
        legacyPayload: {
          success: true,
        },
        requestMeta: {
          ...requestMeta,
          sessionId: authContext.sessionJti,
          userId: authContext.userId,
        },
      }
    );
  } catch (error) {
    const message = String(error?.message || 'Notification delete failed');
    const status = message.includes('Authentication session is required')
      ? 401
      : Number.isFinite(Number(error?.status))
        ? Number(error.status)
        : 500;

    return createApiErrorResponse(
      {
        code: status === 401 ? 'UNAUTHORIZED' : 'NOTIFICATIONS_DELETE_FAILED',
        message,
      },
      {
        requestMeta,
        status,
      }
    );
  }
}
