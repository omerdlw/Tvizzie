import 'server-only';

import { createAppError } from '@/infrastructure/http/app-error';
import { createMediaPayload } from '@/domains/media/shared/media';
import {
  normalizeRating,
  REVIEW_MAX_LENGTH,
  REVIEW_MIN_LENGTH,
} from '@/domains/reviews/shared/review-utils';

import {
  normalizeOptionalNumber,
  normalizePayloadObject,
  normalizeValue,
} from './write-input.server.js';

function normalizeSpoiler(value) {
  return value === true;
}

function assertReviewContent(content, { allowEmpty = false, label = 'Review' } = {}) {
  if (!content && !allowEmpty) {
    throw new Error(`Write a ${label.toLowerCase()} to share your thoughts`);
  }

  if (content.length > 0 && content.length < REVIEW_MIN_LENGTH) {
    throw new Error(`${label} must be at least ${REVIEW_MIN_LENGTH} characters long`);
  }

  if (content.length > REVIEW_MAX_LENGTH) {
    throw new Error(`${label} must be at most ${REVIEW_MAX_LENGTH} characters long`);
  }
}

const ALLOWED_PAYLOAD_KEYS = new Set([
  'backdropPath',
  'backdrop_path',
  'posterPath',
  'poster_path',
  'subjectBackdrop',
  'subjectHref',
  'subjectId',
  'subjectPoster',
  'subjectPreviewItems',
  'subjectTitle',
  'subjectType',
  'title',
]);

async function upsertMediaReview({ admin, body, userId }) {
  const mediaKey = normalizeValue(body?.mediaKey);
  const content = normalizeValue(body?.content);
  const rating = normalizeRating(body?.rating);
  const isSpoiler = normalizeSpoiler(body?.isSpoiler);
  const payloadPatch = normalizePayloadObject(body?.payload);

  if (!mediaKey) {
    throw new Error('mediaKey is required');
  }

  assertReviewContent(content, { allowEmpty: rating !== null });

  const mediaPayload = body?.media ? createMediaPayload(body.media, userId) : null;
  const safePatch = Object.fromEntries(
    Object.entries(payloadPatch).filter(([key]) => ALLOWED_PAYLOAD_KEYS.has(key)),
  );

  const rpcResult = await admin.rpc('review_upsert_media', {
    p_backdrop_path: mediaPayload?.backdrop_path || null,
    p_content: content || null,
    p_entity_id: mediaPayload?.entityId || '',
    p_entity_type: mediaPayload?.entityType || '',
    p_is_spoiler: Boolean(isSpoiler),
    p_media_key: mediaKey,
    p_payload: safePatch,
    p_poster_path: mediaPayload?.poster_path || null,
    p_rating: rating,
    p_title: mediaPayload?.title || '',
    p_user_id: userId,
  });

  if (rpcResult.error) {
    throw new Error(rpcResult.error.message || 'Review could not be saved');
  }

  const resultRow = Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data;
  return {
    created: Boolean(resultRow?.out_created ?? resultRow?.created),
  };
}

async function upsertListReview({ admin, body, userId }) {
  const listId = normalizeValue(body?.listId);
  const content = normalizeValue(body?.content);
  const rating = normalizeOptionalNumber(body?.rating);
  const isSpoiler = normalizeSpoiler(body?.isSpoiler);
  const payloadPatch = normalizePayloadObject(body?.payload);

  if (!listId) {
    throw new Error('listId is required');
  }

  if (rating !== null) {
    throw new Error('Lists only support comments');
  }

  assertReviewContent(content, { label: 'Comment' });

  const safePatch = Object.fromEntries(
    Object.entries(payloadPatch).filter(([key]) => ALLOWED_PAYLOAD_KEYS.has(key)),
  );

  const rpcResult = await admin.rpc('review_upsert_list', {
    p_content: content,
    p_is_spoiler: Boolean(isSpoiler),
    p_list_id: listId,
    p_payload: safePatch,
    p_rating: null,
    p_user_id: userId,
  });

  if (rpcResult.error) {
    throw new Error(rpcResult.error.message || 'Review could not be saved');
  }

  const resultRow = Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data;
  return {
    created: Boolean(resultRow?.out_created ?? resultRow?.created),
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

  const rpcResult = await admin.rpc('review_delete_list', {
    p_list_id: listId,
    p_user_id: userId,
  });

  if (rpcResult.error) {
    throw new Error(rpcResult.error.message || 'Review could not be deleted');
  }

  const resultRow = Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data;
  return {
    deleted: Boolean(resultRow?.out_deleted ?? resultRow?.deleted),
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

  const rpcResult = await admin.rpc('review_toggle_like', {
    p_media_key: reviewKey,
    p_review_user_id: reviewUserId,
    p_user_id: userId,
  });

  if (rpcResult.error) {
    throw new Error(rpcResult.error.message || 'Review like could not be updated');
  }

  const resultRow = Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data;
  return {
    isNowLiked: Boolean(resultRow?.out_is_liked ?? resultRow?.is_liked),
  };
}

export async function executeReviewWriteAction({ action, admin, body, userClient, userId }) {
  const normalizedAction = normalizeValue(action).toLowerCase();

  if (normalizedAction === 'upsert-media-review') {
    return upsertMediaReview({ admin, body, userClient, userId });
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
