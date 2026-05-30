import 'server-only';

import { readSessionFromRequest, requireAuthenticatedRequest } from '@/core/auth/servers/session.js';
import { getFollowResource } from '@/core/services/social/follow-resources.server';
import {
  createApiErrorResponse,
  createApiSuccessResponse,
  getOrLoadCachedValue,
  invokeInternalEdgeFunction,
} from '@/core/services/shared/server';

import { invalidateNotificationCachesForUsers, publishFollowChange } from './follows.events.server';
import {
  createRequestMeta,
  createValidationErrorResponse,
  createWriteErrorResponse,
  createWriteSuccessResponse,
  normalizeValue,
} from './follows.shared';

function createFollowCacheKey({ resource, userId, targetId, status, viewerId }) {
  return `follows|resource=${resource}|user=${userId}|target=${targetId}|status=${status}|viewer=${viewerId || 'anon'}`;
}

async function parseJsonBody(request) {
  return request.json().catch(() => ({}));
}

function createInvalidActionResponse({ authContext, requestMeta, userId }) {
  return createValidationErrorResponse({
    authContext,
    message: 'Unsupported follow action',
    requestMeta,
    userId,
  });
}

function createMissingFieldResponse({ authContext, fieldName, requestMeta, userId }) {
  return createValidationErrorResponse({
    authContext,
    message: `${fieldName} is required`,
    requestMeta,
    userId,
  });
}

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

async function executeFollowMutation({
  authContext,
  request,
  requestMeta,
  controlBody,
  event,
  includeStatus = false,
  userIdsForNotificationInvalidation = [],
  payloadBuilder,
  userId,
}) {
  const mutationUserId = userId || authContext.userId;
  const result = await invokeFollowControl({
    authContext,
    body: controlBody,
    request,
    requestMeta,
    userId: mutationUserId,
  });
  const status = normalizeValue(result?.status) || null;

  publishFollowChange({
    ...event,
    ...(includeStatus ? { status } : {}),
    traceId: requestMeta.traceId,
  });
  invalidateNotificationCachesForUsers(userIdsForNotificationInvalidation);

  return createWriteSuccessResponse({
    authContext,
    payload:
      typeof payloadBuilder === 'function'
        ? payloadBuilder({ result, status })
        : {
            success: true,
          },
    requestMeta,
    userId: mutationUserId,
  });
}

function createWriteStatusPayload({ result }) {
  return {
    status: result?.status || null,
    success: true,
  };
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
      cacheKey: createFollowCacheKey({
        resource,
        status,
        targetId,
        userId,
        viewerId,
      }),
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
    const body = await parseJsonBody(request);
    const action = normalizeValue(body?.action);

    if (action !== 'follow') {
      return createInvalidActionResponse({ authContext, requestMeta });
    }

    const followerId = authContext.userId;
    const followingId = normalizeValue(body?.followingId);

    if (!followingId) {
      return createMissingFieldResponse({
        authContext,
        fieldName: 'followingId',
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

    return executeFollowMutation({
      authContext,
      request,
      requestMeta,
      controlBody: {
        action: 'follow',
        actorUserId: followerId,
        targetUserId: followingId,
      },
      event: {
        followerId,
        followingId,
        reason: 'follow',
      },
      includeStatus: true,
      payloadBuilder: createWriteStatusPayload,
      userIdsForNotificationInvalidation: [followerId, followingId],
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
    const body = await parseJsonBody(request);
    const action = normalizeValue(body?.action);
    const requesterId = normalizeValue(body?.requesterId);
    const userId = authContext.userId;

    if (action !== 'accept' && action !== 'reject') {
      return createInvalidActionResponse({ authContext, requestMeta, userId });
    }

    if (!requesterId) {
      return createMissingFieldResponse({
        authContext,
        fieldName: 'requesterId',
        requestMeta,
        userId,
      });
    }

    return executeFollowMutation({
      authContext,
      request,
      requestMeta,
      userId,
      controlBody: {
        action,
        actorUserId: userId,
        requesterId,
      },
      event: {
        followerId: requesterId,
        followingId: userId,
        reason: action,
      },
      includeStatus: true,
      payloadBuilder: createWriteStatusPayload,
      userIdsForNotificationInvalidation: [requesterId, userId],
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
    return createMissingFieldResponse({
      authContext,
      fieldName: 'followingId',
      requestMeta,
      userId,
    });
  }

  return executeFollowMutation({
    authContext,
    request,
    requestMeta,
    userId,
    controlBody: {
      action,
      actorUserId: userId,
      targetUserId: followingId,
    },
    event: {
      followerId: userId,
      followingId,
      reason: action,
    },
    userIdsForNotificationInvalidation: [userId, followingId],
  });
}

async function handleRemoveFollower({ authContext, body, request, requestMeta, userId }) {
  const followerId = normalizeValue(body?.followerId);

  if (!followerId) {
    return createMissingFieldResponse({
      authContext,
      fieldName: 'followerId',
      requestMeta,
      userId,
    });
  }

  return executeFollowMutation({
    authContext,
    request,
    requestMeta,
    userId,
    controlBody: {
      action: 'remove-follower',
      actorUserId: userId,
      requesterId: followerId,
    },
    event: {
      followerId,
      followingId: userId,
      reason: 'remove-follower',
    },
    userIdsForNotificationInvalidation: [followerId, userId],
  });
}

export async function handleFollowsDelete(request) {
  const requestMeta = createRequestMeta(request, 'api/follows:delete');

  try {
    const authContext = await requireAuthenticatedRequest(request);
    const body = await parseJsonBody(request);
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

    return createInvalidActionResponse({ authContext, requestMeta, userId });
  } catch (error) {
    return createWriteErrorResponse({
      code: 'FOLLOWS_DELETE_FAILED',
      error,
      fallbackMessage: 'Follow relationship could not be removed',
      requestMeta,
    });
  }
}
