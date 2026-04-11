import { requireAuthenticatedRequest } from '@/core/auth/servers/session/authenticated-request.server';
import { createAdminClient } from '@/core/clients/supabase/admin';
import { createApiErrorResponse, createApiSuccessResponse } from '@/core/services/shared/api-response.server';
import { buildInternalRequestMeta } from '@/core/services/shared/request-meta.server';
import { executeWriteRollout } from '@/core/services/shared/write-rollout.server';

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeOptionalNumber(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error('Invalid numeric value');
  }

  return parsed;
}

function normalizePayloadObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value;
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
    normalizedMessage.includes('required') ||
    normalizedMessage.includes('invalid') ||
    normalizedMessage.includes('cannot') ||
    normalizedMessage.includes('unsupported') ||
    normalizedMessage.includes('not found')
  ) {
    return 400;
  }

  return 500;
}

async function upsertMediaReviewLegacy({ admin, body, userId }) {
  const mediaKey = normalizeValue(body?.mediaKey);
  const content = normalizeValue(body?.content);
  const rating = normalizeOptionalNumber(body?.rating);
  const isSpoiler = Boolean(body?.isSpoiler);
  const payloadPatch = normalizePayloadObject(body?.payload);

  if (!mediaKey) {
    throw new Error('mediaKey is required');
  }

  const existingResult = await admin
    .from('media_reviews')
    .select('created_at,payload')
    .eq('media_key', mediaKey)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingResult.error) {
    throw new Error(existingResult.error.message || 'Review state could not be loaded');
  }

  const existingPayload = normalizePayloadObject(existingResult.data?.payload);
  const nowIso = new Date().toISOString();
  const payload = {
    ...existingPayload,
    ...payloadPatch,
    content,
    isSpoiler: content ? isSpoiler : false,
    rating,
  };

  const upsertResult = await admin.from('media_reviews').upsert(
    {
      media_key: mediaKey,
      user_id: userId,
      content,
      rating,
      is_spoiler: content ? isSpoiler : false,
      payload,
      created_at: existingResult.data?.created_at || nowIso,
      updated_at: nowIso,
    },
    { onConflict: 'media_key,user_id' }
  );

  if (upsertResult.error) {
    throw new Error(upsertResult.error.message || 'Review could not be saved');
  }

  return {
    created: !existingResult.data,
  };
}

async function upsertListReviewLegacy({ admin, body, userId }) {
  const listId = normalizeValue(body?.listId);
  const content = normalizeValue(body?.content);
  const rating = normalizeOptionalNumber(body?.rating);
  const isSpoiler = Boolean(body?.isSpoiler);
  const payloadPatch = normalizePayloadObject(body?.payload);

  if (!listId) {
    throw new Error('listId is required');
  }

  const existingResult = await admin
    .from('list_reviews')
    .select('created_at,payload')
    .eq('list_id', listId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingResult.error) {
    throw new Error(existingResult.error.message || 'Review state could not be loaded');
  }

  const existingPayload = normalizePayloadObject(existingResult.data?.payload);
  const nowIso = new Date().toISOString();
  const payload = {
    ...existingPayload,
    ...payloadPatch,
    content,
    isSpoiler: content ? isSpoiler : false,
    rating,
  };

  const upsertResult = await admin.from('list_reviews').upsert(
    {
      list_id: listId,
      user_id: userId,
      content,
      rating,
      is_spoiler: content ? isSpoiler : false,
      payload,
      created_at: existingResult.data?.created_at || nowIso,
      updated_at: nowIso,
    },
    { onConflict: 'list_id,user_id' }
  );

  if (upsertResult.error) {
    throw new Error(upsertResult.error.message || 'Review could not be saved');
  }

  return {
    created: !existingResult.data,
  };
}

async function deleteMediaReviewLegacy({ admin, body, userId }) {
  const mediaKey = normalizeValue(body?.mediaKey);

  if (!mediaKey) {
    throw new Error('mediaKey is required');
  }

  const result = await admin.from('media_reviews').delete().eq('media_key', mediaKey).eq('user_id', userId).select('media_key');

  if (result.error) {
    throw new Error(result.error.message || 'Review could not be deleted');
  }

  return {
    deleted: Array.isArray(result.data) && result.data.length > 0,
  };
}

async function deleteListReviewLegacy({ admin, body, userId }) {
  const listId = normalizeValue(body?.listId);

  if (!listId) {
    throw new Error('listId is required');
  }

  const result = await admin.from('list_reviews').delete().eq('list_id', listId).eq('user_id', userId).select('list_id');

  if (result.error) {
    throw new Error(result.error.message || 'Review could not be deleted');
  }

  return {
    deleted: Array.isArray(result.data) && result.data.length > 0,
  };
}

async function toggleReviewLikeLegacy({ admin, body, userId }) {
  const reviewKey = normalizeValue(body?.reviewKey);
  const reviewUserId = normalizeValue(body?.reviewUserId);

  if (!reviewKey || !reviewUserId) {
    throw new Error('reviewKey and reviewUserId are required');
  }

  if (reviewUserId === userId) {
    throw new Error('You cannot like your own review');
  }

  const existingResult = await admin
    .from('review_likes')
    .select('media_key')
    .eq('media_key', reviewKey)
    .eq('review_user_id', reviewUserId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingResult.error) {
    throw new Error(existingResult.error.message || 'Review like state could not be loaded');
  }

  if (existingResult.data) {
    const deleteResult = await admin
      .from('review_likes')
      .delete()
      .eq('media_key', reviewKey)
      .eq('review_user_id', reviewUserId)
      .eq('user_id', userId);

    if (deleteResult.error) {
      throw new Error(deleteResult.error.message || 'Review like could not be removed');
    }

    return {
      isNowLiked: false,
    };
  }

  const insertResult = await admin.from('review_likes').insert({
    media_key: reviewKey,
    review_user_id: reviewUserId,
    user_id: userId,
    created_at: new Date().toISOString(),
  });

  if (insertResult.error) {
    throw new Error(insertResult.error.message || 'Review like could not be added');
  }

  return {
    isNowLiked: true,
  };
}

async function executeLegacyAction({ action, admin, body, userId }) {
  const normalizedAction = normalizeValue(action).toLowerCase();

  if (normalizedAction === 'upsert-media-review') {
    return upsertMediaReviewLegacy({ admin, body, userId });
  }

  if (normalizedAction === 'upsert-list-review') {
    return upsertListReviewLegacy({ admin, body, userId });
  }

  if (normalizedAction === 'delete-media-review') {
    return deleteMediaReviewLegacy({ admin, body, userId });
  }

  if (normalizedAction === 'delete-list-review') {
    return deleteListReviewLegacy({ admin, body, userId });
  }

  if (normalizedAction === 'toggle-review-like') {
    return toggleReviewLikeLegacy({ admin, body, userId });
  }

  throw new Error('Unsupported review write action');
}

export async function POST(request) {
  const requestMeta = buildInternalRequestMeta({
    request,
    source: 'api/reviews/write',
  });

  try {
    const authContext = await requireAuthenticatedRequest(request);
    const body = await request.json().catch(() => ({}));
    const action = normalizeValue(body?.action);

    if (!action) {
      return createApiErrorResponse(
        {
          code: 'VALIDATION_ERROR',
          message: 'action is required',
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

    const admin = createAdminClient();
    const rolloutResult = await executeWriteRollout({
      domain: 'reviews',
      endpoint: action,
      userId: authContext.userId,
      requestId: requestMeta.requestId,
      logger(entry) {
        console.warn('[Rollout][reviews-write]', entry);
      },
      legacyWrite: async () =>
        executeLegacyAction({
          action,
          admin,
          body,
          userId: authContext.userId,
        }),
    });

    return createApiSuccessResponse(
      {
        decision: rolloutResult?.decision || null,
        result: rolloutResult?.result || null,
        source: rolloutResult?.source || 'legacy',
      },
      {
        legacyPayload: {
          decision: rolloutResult?.decision || null,
          source: rolloutResult?.source || 'legacy',
          ...normalizePayloadObject(rolloutResult?.result),
        },
        requestMeta: {
          ...requestMeta,
          sessionId: authContext.sessionJti,
          userId: authContext.userId,
        },
      }
    );
  } catch (error) {
    const message = normalizeValue(error?.message || 'Review write failed');
    const status = Number.isFinite(Number(error?.status)) ? Number(error.status) : resolveWriteStatusCode(message);

    return createApiErrorResponse(
      {
        code: status === 401 ? 'UNAUTHORIZED' : 'REVIEWS_WRITE_FAILED',
        message,
      },
      {
        requestMeta,
        status,
      }
    );
  }
}
