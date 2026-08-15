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

async function loadReviewAuthor(admin, userId) {
  const result = await admin
    .from('profiles')
    .select('id,avatar_url,display_name,username')
    .eq('id', userId)
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message || 'Review author could not be loaded');
  }

  const profile = result.data || {};
  return {
    avatarUrl: profile.avatar_url || null,
    id: userId,
    name: profile.display_name || profile.username || 'Anonymous User',
    username: profile.username || null,
  };
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

function createReviewPayload({
  author,
  content,
  existingPayload,
  isSpoiler,
  payloadPatch,
  rating,
  userId,
}) {
  const safePatch = Object.fromEntries(
    Object.entries(payloadPatch).filter(([key]) => ALLOWED_PAYLOAD_KEYS.has(key)),
  );

  return {
    ...existingPayload,
    ...safePatch,
    authorId: userId,
    content,
    isSpoiler,
    rating,
    user: author,
  };
}

async function ensureMediaWatchedForReview({
  admin,
  hasText,
  media,
  mediaKey,
  userClient,
  userId,
}) {
  const mediaPayload = createMediaPayload(media, userId);
  if (mediaPayload.mediaKey !== mediaKey) {
    throw new Error('Review media does not match its media key');
  }
  const existingResult = await admin
    .from('watched')
    .select('media_key')
    .eq('media_key', mediaPayload.mediaKey)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingResult.error) {
    throw new Error(existingResult.error.message || 'Watched state could not be loaded');
  }
  if (existingResult.data) return;

  const watchedAt = new Date().toISOString();
  const watchedPayload = {
    ...mediaPayload,
    addedAt: watchedAt,
    firstWatchedAt: watchedAt,
    lastWatchedAt: watchedAt,
    sourceLastAction: hasText ? 'review' : 'rating',
    updatedAt: watchedAt,
    watchCount: 1,
  };
  const rpcResult = await userClient.rpc('collection_mark_watched', {
    p_backdrop_path: mediaPayload.backdrop_path || null,
    p_entity_id: mediaPayload.entityId,
    p_entity_type: mediaPayload.entityType,
    p_last_watched_at: watchedAt,
    p_media_key: mediaPayload.mediaKey,
    p_payload: watchedPayload,
    p_poster_path: mediaPayload.poster_path || null,
    p_source_last_action: watchedPayload.sourceLastAction,
    p_title: mediaPayload.title,
    p_user_id: userId,
  });

  if (rpcResult.error) {
    throw new Error(rpcResult.error.message || 'Watched item could not be saved');
  }
}

async function adjustListReviewsCount({ admin, delta, listId }) {
  const listResult = await admin
    .from('lists')
    .select('reviews_count')
    .eq('id', listId)
    .maybeSingle();

  if (listResult.error) {
    throw new Error(listResult.error.message || 'List could not be loaded');
  }
  if (!listResult.data) {
    throw new Error('List not found');
  }

  const updateResult = await admin
    .from('lists')
    .update({
      reviews_count: Math.max(0, Number(listResult.data.reviews_count || 0) + delta),
      updated_at: new Date().toISOString(),
    })
    .eq('id', listId);

  if (updateResult.error) {
    throw new Error(updateResult.error.message || 'List review count could not be updated');
  }
}

async function upsertMediaReview({ admin, body, userClient, userId }) {
  const mediaKey = normalizeValue(body?.mediaKey);
  const content = normalizeValue(body?.content);
  const rating = normalizeRating(body?.rating);
  const isSpoiler = normalizeSpoiler(body?.isSpoiler);
  const payloadPatch = normalizePayloadObject(body?.payload);

  if (!mediaKey) {
    throw new Error('mediaKey is required');
  }

  assertReviewContent(content, { allowEmpty: rating !== null });

  await ensureMediaWatchedForReview({
    admin,
    hasText: Boolean(content),
    media: body?.media,
    mediaKey,
    userClient,
    userId,
  });

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
  const payload = createReviewPayload({
    author: await loadReviewAuthor(admin, userId),
    content,
    existingPayload,
    isSpoiler: content ? isSpoiler : false,
    payloadPatch,
    rating,
    userId,
  });

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
    { onConflict: 'media_key,user_id' },
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
  const isSpoiler = normalizeSpoiler(body?.isSpoiler);
  const payloadPatch = normalizePayloadObject(body?.payload);

  if (!listId) {
    throw new Error('listId is required');
  }

  if (rating !== null) {
    throw new Error('Lists only support comments');
  }

  assertReviewContent(content, { label: 'Comment' });

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
  const payload = createReviewPayload({
    author: await loadReviewAuthor(admin, userId),
    content,
    existingPayload,
    isSpoiler: content ? isSpoiler : false,
    payloadPatch,
    rating: null,
    userId,
  });

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
    { onConflict: 'list_id,user_id' },
  );

  if (upsertResult.error) {
    throw new Error(upsertResult.error.message || 'Review could not be saved');
  }

  if (!existingResult.data) {
    await adjustListReviewsCount({ admin, delta: 1, listId });
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

  const deleted = Array.isArray(result.data) && result.data.length > 0;
  if (deleted) {
    await adjustListReviewsCount({ admin, delta: -1, listId });
  }

  return {
    deleted,
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
