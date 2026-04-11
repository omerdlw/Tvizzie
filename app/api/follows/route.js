import { requireAuthenticatedRequest } from '@/core/auth/servers/session/authenticated-request.server';
import { readSessionFromRequest } from '@/core/auth/servers/session/session.server';
import { publishUserEvent } from '@/core/services/realtime/user-events.server';
import { createApiErrorResponse, createApiSuccessResponse } from '@/core/services/shared/api-response.server';
import { buildInternalRequestMeta } from '@/core/services/shared/request-meta.server';
import { invokeInternalEdgeFunction } from '@/core/services/shared/supabase-edge-internal.server';
import { getFollowResource } from '@/core/services/browser/browser-data.server';
import { getOrLoadCachedValue, invalidateCachedValuesWhere } from '@/core/services/shared/memory-cache.server';

export const runtime = 'nodejs';

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeErrorMessage(error, fallbackMessage) {
  return normalizeValue(error?.message || fallbackMessage);
}

function resolveWriteStatusCode(message) {
  const normalizedMessage = normalizeValue(message).toLowerCase();

  if (
    normalizedMessage.includes('authentication session is required') ||
    normalizedMessage.includes('invalid or expired authentication token') ||
    normalizedMessage.includes('authentication token has been revoked')
  ) {
    return 401;
  }

  if (
    normalizedMessage.includes('not found') ||
    normalizedMessage.includes('already been resolved') ||
    normalizedMessage.includes('cannot follow yourself') ||
    normalizedMessage.includes('invalid') ||
    normalizedMessage.includes('required') ||
    normalizedMessage.includes('unsupported')
  ) {
    return 400;
  }

  return 500;
}

function publishFollowChange({ followerId, followingId, reason, status = null, traceId = null }) {
  const payload = {
    eventType: 'follows',
    followerId,
    followingId,
    reason,
    status,
    traceId: traceId || null,
  };

  publishUserEvent(followerId, 'follows', payload);
  publishUserEvent(followingId, 'follows', payload);
}

function invalidateNotificationCachesForUsers(userIds = []) {
  const normalizedUserIds = [...new Set((Array.isArray(userIds) ? userIds : []).map(normalizeValue).filter(Boolean))];

  if (!normalizedUserIds.length) {
    return;
  }

  invalidateCachedValuesWhere(
    (cacheKey) =>
      cacheKey.startsWith('notifications|') &&
      normalizedUserIds.some((userId) => cacheKey.includes(`|user=${userId}`))
  );
}

export async function GET(request) {
  const requestMeta = buildInternalRequestMeta({
    request,
    source: 'api/follows:get',
  });
  try {
    const { searchParams } = new URL(request.url);
    const sessionContext = await readSessionFromRequest(request, {
      skipSupabaseFallback: true,
    }).catch(() => null);
    const resource = normalizeValue(searchParams.get('resource'));
    const userId = normalizeValue(searchParams.get('userId'));
    const targetId = normalizeValue(searchParams.get('targetId'));
    const status = normalizeValue(searchParams.get('status'));
    const viewerId = sessionContext?.userId || null;
    const data = await getOrLoadCachedValue({
      cacheKey: `follows|resource=${resource}|user=${userId}|target=${targetId}|status=${status}|viewer=${viewerId || 'anon'}`,
      enabled: true,
      ttlMs: 3000,
      loader: () =>
        getFollowResource({
          resource,
          strict: true,
          userId,
          targetId,
          viewerId,
          status: status || null,
        }),
    });

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
          sessionId: sessionContext?.sessionJti || null,
          userId: sessionContext?.userId || null,
        },
      }
    );
  } catch (error) {
    const status = Number.isFinite(Number(error?.status)) ? Number(error.status) : 500;

    return createApiErrorResponse(
      {
        code: 'FOLLOWS_FETCH_FAILED',
        message: String(error?.message || 'Follow resource could not be loaded'),
      },
      {
        requestMeta,
        status,
      }
    );
  }
}

export async function POST(request) {
  const requestMeta = buildInternalRequestMeta({
    request,
    source: 'api/follows:post',
  });
  try {
    const authContext = await requireAuthenticatedRequest(request);
    const body = await request.json().catch(() => ({}));
    const action = normalizeValue(body?.action);

    if (action !== 'follow') {
      return createApiErrorResponse(
        {
          code: 'VALIDATION_ERROR',
          message: 'Unsupported follow action',
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

    const followerId = authContext.userId;
    const followingId = normalizeValue(body?.followingId);

    if (!followingId) {
      return createApiErrorResponse(
        {
          code: 'VALIDATION_ERROR',
          message: 'followingId is required',
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

    if (followerId === followingId) {
      return createApiErrorResponse(
        {
          code: 'VALIDATION_ERROR',
          message: 'You cannot follow yourself',
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

    const result = await invokeInternalEdgeFunction('follow-control', {
      body: {
        action: 'follow',
        actorUserId: followerId,
        targetUserId: followingId,
      },
      request,
      requestMeta: {
        ...requestMeta,
        sessionId: authContext.sessionJti,
        userId: authContext.userId,
      },
      source: 'follow-control',
    });

    publishFollowChange({
      followerId,
      followingId,
      reason: 'follow',
      status: normalizeValue(result?.status) || null,
      traceId: requestMeta.traceId,
    });
    invalidateNotificationCachesForUsers([followerId, followingId]);

    return createApiSuccessResponse(
      {
        status: result?.status || null,
        success: true,
      },
      {
        legacyPayload: {
          success: true,
          status: result?.status || null,
        },
        requestMeta: {
          ...requestMeta,
          sessionId: authContext.sessionJti,
          userId: authContext.userId,
        },
      }
    );
  } catch (error) {
    const message = normalizeErrorMessage(error, 'Follow action failed');
    const status = Number.isFinite(Number(error?.status)) ? Number(error.status) : resolveWriteStatusCode(message);

    return createApiErrorResponse(
      {
        code: status === 401 ? 'UNAUTHORIZED' : 'FOLLOWS_WRITE_FAILED',
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
    source: 'api/follows:patch',
  });
  try {
    const authContext = await requireAuthenticatedRequest(request);
    const body = await request.json().catch(() => ({}));
    const action = normalizeValue(body?.action);
    const requesterId = normalizeValue(body?.requesterId);
    const userId = authContext.userId;

    if (action !== 'accept' && action !== 'reject') {
      return createApiErrorResponse(
        {
          code: 'VALIDATION_ERROR',
          message: 'Unsupported follow action',
        },
        {
          requestMeta: {
            ...requestMeta,
            sessionId: authContext.sessionJti,
            userId,
          },
          status: 400,
        }
      );
    }

    if (!requesterId) {
      return createApiErrorResponse(
        {
          code: 'VALIDATION_ERROR',
          message: 'requesterId is required',
        },
        {
          requestMeta: {
            ...requestMeta,
            sessionId: authContext.sessionJti,
            userId,
          },
          status: 400,
        }
      );
    }

    const result = await invokeInternalEdgeFunction('follow-control', {
      body: {
        action,
        actorUserId: userId,
        requesterId,
      },
      request,
      requestMeta: {
        ...requestMeta,
        sessionId: authContext.sessionJti,
        userId,
      },
      source: 'follow-control',
    });

    publishFollowChange({
      followerId: requesterId,
      followingId: userId,
      reason: action,
      status: normalizeValue(result?.status) || null,
      traceId: requestMeta.traceId,
    });
    invalidateNotificationCachesForUsers([requesterId, userId]);

    return createApiSuccessResponse(
      {
        status: result?.status || null,
        success: true,
      },
      {
        legacyPayload: {
          success: true,
          status: result?.status || null,
        },
        requestMeta: {
          ...requestMeta,
          sessionId: authContext.sessionJti,
          userId,
        },
      }
    );
  } catch (error) {
    const message = normalizeErrorMessage(error, 'Follow request could not be updated');
    const status = Number.isFinite(Number(error?.status)) ? Number(error.status) : resolveWriteStatusCode(message);

    return createApiErrorResponse(
      {
        code: status === 401 ? 'UNAUTHORIZED' : 'FOLLOWS_WRITE_FAILED',
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
    source: 'api/follows:delete',
  });
  try {
    const authContext = await requireAuthenticatedRequest(request);
    const body = await request.json().catch(() => ({}));
    const action = normalizeValue(body?.action);
    const userId = authContext.userId;

    if (action === 'unfollow' || action === 'cancel-request') {
      const followingId = normalizeValue(body?.followingId);

      if (!followingId) {
        return createApiErrorResponse(
          {
            code: 'VALIDATION_ERROR',
            message: 'followingId is required',
          },
          {
            requestMeta: {
              ...requestMeta,
              sessionId: authContext.sessionJti,
              userId,
            },
            status: 400,
          }
        );
      }

      await invokeInternalEdgeFunction('follow-control', {
        body: {
          action,
          actorUserId: userId,
          targetUserId: followingId,
        },
        request,
        requestMeta: {
          ...requestMeta,
          sessionId: authContext.sessionJti,
          userId,
        },
        source: 'follow-control',
      });

      publishFollowChange({
        followerId: userId,
        followingId,
        reason: action,
        traceId: requestMeta.traceId,
      });
      invalidateNotificationCachesForUsers([userId, followingId]);

      return createApiSuccessResponse(
        {
          success: true,
        },
        {
          legacyPayload: {
            success: true,
          },
          requestMeta: {
            ...requestMeta,
            sessionId: authContext.sessionJti,
            userId,
          },
        }
      );
    }

    if (action === 'remove-follower') {
      const followerId = normalizeValue(body?.followerId);

      if (!followerId) {
        return createApiErrorResponse(
          {
            code: 'VALIDATION_ERROR',
            message: 'followerId is required',
          },
          {
            requestMeta: {
              ...requestMeta,
              sessionId: authContext.sessionJti,
              userId,
            },
            status: 400,
          }
        );
      }

      await invokeInternalEdgeFunction('follow-control', {
        body: {
          action,
          actorUserId: userId,
          requesterId: followerId,
        },
        request,
        requestMeta: {
          ...requestMeta,
          sessionId: authContext.sessionJti,
          userId,
        },
        source: 'follow-control',
      });

      publishFollowChange({
        followerId,
        followingId: userId,
        reason: action,
        traceId: requestMeta.traceId,
      });
      invalidateNotificationCachesForUsers([followerId, userId]);

      return createApiSuccessResponse(
        {
          success: true,
        },
        {
          legacyPayload: {
            success: true,
          },
          requestMeta: {
            ...requestMeta,
            sessionId: authContext.sessionJti,
            userId,
          },
        }
      );
    }

    return createApiErrorResponse(
      {
        code: 'VALIDATION_ERROR',
        message: 'Unsupported follow action',
      },
      {
        requestMeta: {
          ...requestMeta,
          sessionId: authContext.sessionJti,
          userId,
        },
        status: 400,
      }
    );
  } catch (error) {
    const message = normalizeErrorMessage(error, 'Follow relationship could not be removed');
    const status = Number.isFinite(Number(error?.status)) ? Number(error.status) : resolveWriteStatusCode(message);

    return createApiErrorResponse(
      {
        code: status === 401 ? 'UNAUTHORIZED' : 'FOLLOWS_DELETE_FAILED',
        message,
      },
      {
        requestMeta,
        status,
      }
    );
  }
}
