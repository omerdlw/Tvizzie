import 'server-only';

import { normalizeTimestamp, normalizeValue } from '@/shared/normalize';
import {
  readSessionFromRequest,
  requireAuthenticatedRequest,
} from '@/domains/auth/server/session.js';
import { assertCsrfRequestForCookieSession } from '@/domains/auth/server/security.js';
import {
  createApiErrorResponse,
  createApiSuccessResponse,
} from '@/infrastructure/http/api-response.server';
import {
  getOrLoadCachedValue,
  invalidateCachedValuesWhere,
} from '@/infrastructure/http/memory-cache.server';
import {
  createRouteErrorResponse,
  createRouteRequestMeta,
  createRouteSuccessResponse,
  createRouteValidationErrorResponse,
} from '@/infrastructure/http/route-context.server';
import { createAdminClient } from '@/infrastructure/supabase/admin-client.server';
import { publishUserEvent } from '@/infrastructure/realtime/user-events.server';
import {
  canViewerAccessUserContent,
  createPrivateProfileError,
  getAccountProfileByUserId,
  invalidateCachedAccountProfiles,
} from '@/domains/account/server/profile';
import { createEmptyRelationshipState } from '@/domains/social/utils/formatting';
import { FOLLOW_SELECT } from '@/domains/social/utils/constants';
import { FOLLOW_STATUSES } from '@/domains/social/client/follows';

export function createRequestMeta(request, source) {
  return createRouteRequestMeta(request, source);
}

export function createValidationErrorResponse({
  authContext,
  message,
  requestMeta,
  status = 400,
  userId,
}) {
  return createRouteValidationErrorResponse({
    authContext,
    message,
    requestMeta,
    status,
    userId,
  });
}

export function createWriteSuccessResponse({ authContext, payload, requestMeta, userId }) {
  return createRouteSuccessResponse({
    authContext,
    payload,
    requestMeta,
    userId,
    legacyPayload: payload,
  });
}

export function createWriteErrorResponse({ code, error, fallbackMessage, requestMeta }) {
  return createRouteErrorResponse({
    code,
    error,
    fallbackMessage,
    requestMeta,
    clientErrorPatterns: [
      'not found',
      'already been resolved',
      'cannot follow yourself',
      'invalid',
      'required',
      'unsupported',
    ],
  });
}

export function publishFollowChange({
  followerId,
  followingId,
  reason,
  status = null,
  traceId = null,
}) {
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

export function invalidateNotificationCachesForUsers(userIds = []) {
  const normalizedUserIds = [
    ...new Set((Array.isArray(userIds) ? userIds : []).map(normalizeValue).filter(Boolean)),
  ];

  if (!normalizedUserIds.length) {
    return;
  }

  invalidateCachedValuesWhere(
    (cacheKey) =>
      cacheKey.startsWith('notifications|') &&
      normalizedUserIds.some((userId) => cacheKey.includes(`|user=${userId}`)),
  );
}

export function invalidateFollowCachesForUsers(userIds = []) {
  const normalizedUserIds = [
    ...new Set((Array.isArray(userIds) ? userIds : []).map(normalizeValue).filter(Boolean)),
  ];

  if (!normalizedUserIds.length) {
    return;
  }

  invalidateCachedValuesWhere(
    (cacheKey) =>
      cacheKey.startsWith('follows|') &&
      normalizedUserIds.some(
        (userId) =>
          cacheKey.includes(`user=${userId}`) ||
          cacheKey.includes(`target=${userId}`) ||
          cacheKey.includes(`viewer=${userId}`),
      ),
  );

  normalizedUserIds.forEach((userId) => {
    invalidateCachedAccountProfiles(userId);
  });
}

function assertResult(result, fallbackMessage) {
  if (result?.error) {
    const error = result.error;
    const message = String(error?.message || '').toLowerCase();

    if (
      message.includes('fetch failed') ||
      message.includes('socket') ||
      message.includes('connection')
    ) {
      return { data: null, error };
    }

    throw new Error(error.message || fallbackMessage);
  }

  return result;
}

async function withQueryTimeout(
  promise,
  { timeoutMs = 4000, fallbackValue = { data: [], error: null }, label = 'Query' } = {},
) {
  let timeoutId = null;

  try {
    const timeoutPromise = new Promise((resolve) => {
      timeoutId = setTimeout(() => resolve({ ...fallbackValue, timedOut: true, label }), timeoutMs);
    });

    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function executeCollectionQuery(
  query,
  {
    fallbackValue = { data: [], error: null },
    label = 'Collection query',
    strict = false,
    timeoutMs = 4000,
  } = {},
) {
  if (strict) {
    return query;
  }

  return withQueryTimeout(query, {
    fallbackValue,
    label,
    timeoutMs,
  });
}

function normalizeFollowRecord(record = {}, direction = 'followers') {
  const isFollowersDirection = direction === 'followers';
  const userId = isFollowersDirection ? record.follower_id : record.following_id;

  return {
    avatarUrl: isFollowersDirection
      ? record.follower_avatar_url || null
      : record.following_avatar_url || null,
    createdAt: normalizeTimestamp(record.created_at),
    displayName: isFollowersDirection
      ? record.follower_display_name || null
      : record.following_display_name || null,
    id: userId,
    respondedAt: normalizeTimestamp(record.responded_at),
    status: record.status || FOLLOW_STATUSES.ACCEPTED,
    updatedAt: normalizeTimestamp(record.updated_at),
    userId,
    username: isFollowersDirection
      ? record.follower_username || null
      : record.following_username || null,
  };
}

function sortFollowSnapshots(items = []) {
  return [...items].sort((left, right) => {
    const leftTime = left?.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightTime = right?.createdAt ? new Date(right.createdAt).getTime() : 0;

    return rightTime - leftTime;
  });
}

export async function getFollowResource({
  resource,
  userId,
  targetId = null,
  viewerId = null,
  status = null,
  strict = false,
}) {
  const admin = createAdminClient();

  if (resource === 'followers' || resource === 'following') {
    const normalizedStatus = normalizeValue(status).toLowerCase() || null;
    const canAccessCollection = await canViewerAccessUserContent({
      ownerId: userId,
      viewerId,
    });

    if (!canAccessCollection) {
      throw createPrivateProfileError();
    }

    if (
      normalizedStatus &&
      normalizedStatus !== FOLLOW_STATUSES.ACCEPTED &&
      normalizeValue(viewerId) !== normalizeValue(userId)
    ) {
      const error = new Error('You are not allowed to view this follow collection');
      error.status = 403;
      throw error;
    }

    const direction = resource;
    const baseColumn = direction === 'followers' ? 'following_id' : 'follower_id';
    let query = admin.from('follows').select(FOLLOW_SELECT).eq(baseColumn, userId);

    if (normalizedStatus) {
      query = query.eq('status', normalizedStatus);
    }

    const result = await executeCollectionQuery(query.order('created_at', { ascending: false }), {
      label: `${direction} for user ${userId}`,
      fallbackValue: { data: [], error: null },
      strict,
    });

    if (result?.timedOut) {
      return [];
    }

    assertResult(result, 'Follow collection could not be loaded');

    return sortFollowSnapshots(
      (result.data || []).map((row) => normalizeFollowRecord(row, direction)),
    );
  }

  if (resource === 'relationship') {
    if (!targetId) {
      return createEmptyRelationshipState();
    }

    const targetProfile = await getAccountProfileByUserId(targetId);
    const runRelationshipQuery = (queryPromise, label) =>
      executeCollectionQuery(queryPromise, {
        fallbackValue: { data: null, error: null },
        label,
        strict,
        timeoutMs: 2500,
      });
    const [outboundResult, inboundResult] = await Promise.all([
      viewerId && viewerId !== targetId
        ? runRelationshipQuery(
            admin
              .from('follows')
              .select(FOLLOW_SELECT)
              .eq('follower_id', viewerId)
              .eq('following_id', targetId)
              .maybeSingle(),
            `Outbound follow check ${viewerId} -> ${targetId}`,
          )
        : Promise.resolve({ data: null, error: null }),
      viewerId && viewerId !== targetId
        ? runRelationshipQuery(
            admin
              .from('follows')
              .select(FOLLOW_SELECT)
              .eq('follower_id', targetId)
              .eq('following_id', viewerId)
              .maybeSingle(),
            `Inbound follow check ${targetId} -> ${viewerId}`,
          )
        : Promise.resolve({ data: null, error: null }),
    ]);

    assertResult(outboundResult, 'Outbound relationship could not be loaded');
    assertResult(inboundResult, 'Inbound relationship could not be loaded');

    const outboundRelationship = outboundResult.data
      ? normalizeFollowRecord(outboundResult.data, 'following')
      : null;
    const inboundRelationship = inboundResult.data
      ? normalizeFollowRecord(inboundResult.data, 'followers')
      : null;
    const outboundStatus = outboundRelationship?.status || null;
    const inboundStatus = inboundRelationship?.status || null;
    const isPrivateProfile = !!targetProfile?.isPrivate;
    const canViewPrivateContent =
      !isPrivateProfile || viewerId === targetId || outboundStatus === FOLLOW_STATUSES.ACCEPTED;

    return {
      canViewPrivateContent,
      inboundRelationship,
      isInboundRelationshipLoaded: true,
      isOutboundRelationshipLoaded: true,
      inboundStatus,
      isPrivateProfile,
      isTargetProfileLoaded: true,
      outboundRelationship,
      outboundStatus,
      showFollowBack:
        inboundStatus === FOLLOW_STATUSES.ACCEPTED && outboundStatus !== FOLLOW_STATUSES.ACCEPTED,
    };
  }

  throw new Error('Unsupported follow resource');
}

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

async function invokeFollowControl({ body }) {
  const admin = createAdminClient();
  const action = normalizeValue(body?.action);
  const actorId = normalizeValue(body?.actorUserId);
  const targetId = normalizeValue(body?.targetUserId || body?.requesterId);

  const { data, error } = await admin.rpc('follow_mutate_atomic', {
    p_action: action,
    p_actor_id: actorId,
    p_target_id: targetId,
  });

  if (error) {
    throw new Error(error.message || 'Follow operation failed');
  }

  const result = Array.isArray(data) ? data[0] : data;
  return {
    ok: result?.out_ok ?? true,
    status: result?.out_status ?? null,
  };
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
  invalidateFollowCachesForUsers(userIdsForNotificationInvalidation);

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
    const resource = normalizeValue(searchParams.get('resource'));
    const userId = normalizeValue(searchParams.get('userId'));
    const targetId = normalizeValue(searchParams.get('targetId'));
    const status = normalizeValue(searchParams.get('status'));
    const sessionContext = await readSessionFromRequest(request).catch(() => null);
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
      },
    );
  } catch (error) {
    const status = Number.isFinite(Number(error?.status)) ? Number(error.status) : 500;

    if (status === 403) {
      return createApiSuccessResponse({ data: null, items: [], private: true });
    }

    return createApiErrorResponse(
      {
        code: 'FOLLOWS_FETCH_FAILED',
        message: String(error?.message || 'Follow resource could not be loaded'),
      },
      {
        requestMeta,
        status,
      },
    );
  }
}

export async function handleFollowsPost(request) {
  const requestMeta = createRequestMeta(request, 'api/follows:post');

  try {
    assertCsrfRequestForCookieSession(request);
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
    assertCsrfRequestForCookieSession(request);
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

async function handleUnfollowLikeDelete({
  action,
  authContext,
  body,
  request,
  requestMeta,
  userId,
}) {
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
    assertCsrfRequestForCookieSession(request);
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

export {
  handleFollowsGet as GET,
  handleFollowsPost as POST,
  handleFollowsPatch as PATCH,
  handleFollowsDelete as DELETE,
};
