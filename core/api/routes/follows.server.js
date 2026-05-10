import 'server-only';

import { requireAuthenticatedRequest } from '@/core/auth/servers/session/authenticated-request.server';
import { readSessionFromRequest } from '@/core/auth/servers/session/session.server';
import { getFollowResource } from '@/core/services/social/follow-resources.server';
import { createApiErrorResponse, createApiSuccessResponse } from '@/core/services/shared/api-response.server';
import { invokeInternalEdgeFunction } from '@/core/services/shared/supabase-edge-internal.server';
import { getOrLoadCachedValue } from '@/core/services/shared/memory-cache.server';
import { invalidateNotificationCachesForUsers, publishFollowChange } from './follows.events.server';
import {
  createRequestMeta,
  createValidationErrorResponse,
  createWriteErrorResponse,
  createWriteSuccessResponse,
  normalizeValue,
} from './follows.shared';

async function invokeFollowControl({ authContext, body, request, requestMeta, userId }) {
  return invokeInternalEdgeFunction('follow-control', {
    body,
    request,
    requestMeta: {
      ...requestMeta,
      sessionId: authContext.sessionJti,
      userId: userId || authContext.userId,
    },
    source: 'follow-control',
  });
}

export async function handleFollowsGet(request) {
  const requestMeta = createRequestMeta(request, 'api/follows:get');

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

export async function handleFollowsPost(request) {
  const requestMeta = createRequestMeta(request, 'api/follows:post');

  try {
    const authContext = await requireAuthenticatedRequest(request);
    const body = await request.json().catch(() => ({}));
    const action = normalizeValue(body?.action);

    if (action !== 'follow') {
      return createValidationErrorResponse({
        authContext,
        message: 'Unsupported follow action',
        requestMeta,
      });
    }

    const followerId = authContext.userId;
    const followingId = normalizeValue(body?.followingId);

    if (!followingId) {
      return createValidationErrorResponse({
        authContext,
        message: 'followingId is required',
        requestMeta,
      });
    }

    if (followerId === followingId) {
      return createValidationErrorResponse({
        authContext,
        message: 'You cannot follow yourself',
        requestMeta,
      });
    }

    const result = await invokeFollowControl({
      authContext,
      body: {
        action: 'follow',
        actorUserId: followerId,
        targetUserId: followingId,
      },
      request,
      requestMeta,
    });

    publishFollowChange({
      followerId,
      followingId,
      reason: 'follow',
      status: normalizeValue(result?.status) || null,
      traceId: requestMeta.traceId,
    });
    invalidateNotificationCachesForUsers([followerId, followingId]);

    return createWriteSuccessResponse({
      authContext,
      payload: {
        status: result?.status || null,
        success: true,
      },
      requestMeta,
    });
  } catch (error) {
    return createWriteErrorResponse({
      code: 'FOLLOWS_WRITE_FAILED',
      error,
      fallbackMessage: 'Follow action failed',
      requestMeta,
    });
  }
}

export async function handleFollowsPatch(request) {
  const requestMeta = createRequestMeta(request, 'api/follows:patch');

  try {
    const authContext = await requireAuthenticatedRequest(request);
    const body = await request.json().catch(() => ({}));
    const action = normalizeValue(body?.action);
    const requesterId = normalizeValue(body?.requesterId);
    const userId = authContext.userId;

    if (action !== 'accept' && action !== 'reject') {
      return createValidationErrorResponse({
        authContext,
        message: 'Unsupported follow action',
        requestMeta,
        userId,
      });
    }

    if (!requesterId) {
      return createValidationErrorResponse({
        authContext,
        message: 'requesterId is required',
        requestMeta,
        userId,
      });
    }

    const result = await invokeFollowControl({
      authContext,
      body: {
        action,
        actorUserId: userId,
        requesterId,
      },
      request,
      requestMeta,
      userId,
    });

    publishFollowChange({
      followerId: requesterId,
      followingId: userId,
      reason: action,
      status: normalizeValue(result?.status) || null,
      traceId: requestMeta.traceId,
    });
    invalidateNotificationCachesForUsers([requesterId, userId]);

    return createWriteSuccessResponse({
      authContext,
      payload: {
        status: result?.status || null,
        success: true,
      },
      requestMeta,
      userId,
    });
  } catch (error) {
    return createWriteErrorResponse({
      code: 'FOLLOWS_WRITE_FAILED',
      error,
      fallbackMessage: 'Follow request could not be updated',
      requestMeta,
    });
  }
}

async function handleUnfollowLikeDelete({ action, authContext, body, request, requestMeta, userId }) {
  const followingId = normalizeValue(body?.followingId);

  if (!followingId) {
    return createValidationErrorResponse({
      authContext,
      message: 'followingId is required',
      requestMeta,
      userId,
    });
  }

  await invokeFollowControl({
    authContext,
    body: {
      action,
      actorUserId: userId,
      targetUserId: followingId,
    },
    request,
    requestMeta,
    userId,
  });

  publishFollowChange({
    followerId: userId,
    followingId,
    reason: action,
    traceId: requestMeta.traceId,
  });
  invalidateNotificationCachesForUsers([userId, followingId]);

  return createWriteSuccessResponse({
    authContext,
    payload: {
      success: true,
    },
    requestMeta,
    userId,
  });
}

async function handleRemoveFollower({ authContext, body, request, requestMeta, userId }) {
  const followerId = normalizeValue(body?.followerId);

  if (!followerId) {
    return createValidationErrorResponse({
      authContext,
      message: 'followerId is required',
      requestMeta,
      userId,
    });
  }

  await invokeFollowControl({
    authContext,
    body: {
      action: 'remove-follower',
      actorUserId: userId,
      requesterId: followerId,
    },
    request,
    requestMeta,
    userId,
  });

  publishFollowChange({
    followerId,
    followingId: userId,
    reason: 'remove-follower',
    traceId: requestMeta.traceId,
  });
  invalidateNotificationCachesForUsers([followerId, userId]);

  return createWriteSuccessResponse({
    authContext,
    payload: {
      success: true,
    },
    requestMeta,
    userId,
  });
}

export async function handleFollowsDelete(request) {
  const requestMeta = createRequestMeta(request, 'api/follows:delete');

  try {
    const authContext = await requireAuthenticatedRequest(request);
    const body = await request.json().catch(() => ({}));
    const action = normalizeValue(body?.action);
    const userId = authContext.userId;

    if (action === 'unfollow' || action === 'cancel-request') {
      return handleUnfollowLikeDelete({
        action,
        authContext,
        body,
        request,
        requestMeta,
        userId,
      });
    }

    if (action === 'remove-follower') {
      return handleRemoveFollower({
        authContext,
        body,
        request,
        requestMeta,
        userId,
      });
    }

    return createValidationErrorResponse({
      authContext,
      message: 'Unsupported follow action',
      requestMeta,
      userId,
    });
  } catch (error) {
    return createWriteErrorResponse({
      code: 'FOLLOWS_DELETE_FAILED',
      error,
      fallbackMessage: 'Follow relationship could not be removed',
      requestMeta,
    });
  }
}
