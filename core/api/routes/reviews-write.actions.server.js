import 'server-only';

import { createAppError } from '@/core/services/shared/app-error';

import {
  normalizeOptionalNumber,
  normalizePayloadObject,
  normalizeValue,
  REVIEW_MIN_LENGTH,
} from './reviews-write.shared';

async function upsertMediaReview({ admin, body, userId }) {
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

async function upsertListReview({ admin, body, userId }) {
  const listId = normalizeValue(body?.listId);
  const content = normalizeValue(body?.content);
  const rating = normalizeOptionalNumber(body?.rating);
  const isSpoiler = Boolean(body?.isSpoiler);
  const payloadPatch = normalizePayloadObject(body?.payload);

  if (!listId) {
    throw new Error('listId is required');
  }

  if (rating !== null) {
    throw new Error('Lists only support comments');
  }

  if (!content) {
    throw new Error('Write a comment to share your thoughts');
  }

  if (content.length < REVIEW_MIN_LENGTH) {
    throw new Error(`Comment must be at least ${REVIEW_MIN_LENGTH} characters long`);
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
    rating: null,
  };

  const upsertResult = await admin.from('list_reviews').upsert(
    {
      list_id: listId,
      user_id: userId,
      content,
      rating: null,
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

async function deleteMediaReview({ admin, body, userId }) {
  const mediaKey = normalizeValue(body?.mediaKey);

  if (!mediaKey) {
    throw new Error('mediaKey is required');
  }

  const result = await admin
    .from('media_reviews')
    .delete()
    .eq('media_key', mediaKey)
    .eq('user_id', userId)
    .select('media_key');

  if (result.error) {
    throw new Error(result.error.message || 'Review could not be deleted');
  }

  return {
    deleted: Array.isArray(result.data) && result.data.length > 0,
  };
}

async function deleteListReview({ admin, body, userId }) {
  const listId = normalizeValue(body?.listId);

  if (!listId) {
    throw new Error('listId is required');
  }

  const result = await admin
    .from('list_reviews')
    .delete()
    .eq('list_id', listId)
    .eq('user_id', userId)
    .select('list_id');

  if (result.error) {
    throw new Error(result.error.message || 'Review could not be deleted');
  }

  return {
    deleted: Array.isArray(result.data) && result.data.length > 0,
  };
}

async function toggleReviewLike({ admin, body, userId }) {
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

export async function executeReviewWriteAction({ action, admin, body, userId }) {
  const normalizedAction = normalizeValue(action).toLowerCase();

  if (normalizedAction === 'upsert-media-review') {
    return upsertMediaReview({ admin, body, userId });
  }

  if (normalizedAction === 'upsert-list-review') {
    return upsertListReview({ admin, body, userId });
  }

  if (normalizedAction === 'delete-media-review') {
    return deleteMediaReview({ admin, body, userId });
  }

  if (normalizedAction === 'delete-list-review') {
    return deleteListReview({ admin, body, userId });
  }

  if (normalizedAction === 'toggle-review-like') {
    return toggleReviewLike({ admin, body, userId });
  }

  throw createAppError('Unsupported review write action', {
    code: 'UNSUPPORTED_REVIEW_WRITE_ACTION',
    status: 400,
  });
}
