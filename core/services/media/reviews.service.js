'use client';

import { assertMovieMedia, buildMediaItemKey, createMediaSnapshot } from '@/core/services/shared/media-key.service';
import { isListSubjectType, isMovieMediaType } from '@/core/utils/media';
import {
  buildPollingSubscriptionKey,
  createPollingSubscription,
  invalidatePollingSubscription,
} from '@/core/services/shared/polling-subscription.service';
import { subscribeToUserLiveEvent } from '@/core/services/realtime/live-updates.service';
import { assertSupabaseResult, getSupabaseClient } from '@/core/services/shared/supabase-data.service';
import { requestApiJson } from '@/core/services/shared/api-request.service';
import { ACTIVITY_EVENT_TYPES, fireActivityEvent } from '@/core/services/activity/activity-events.service';
import { buildCanonicalActivityDedupeKey } from '@/core/services/activity/canonical-key';
import { updateListReviewsCount } from '@/core/services/media/lists.service';
import {
  fireNotificationEvent,
  NOTIFICATION_EVENT_TYPES,
} from '@/core/services/notifications/notification-events.service';

const REVIEW_MIN_LENGTH = 10;
const REVIEW_LIMIT = 120;
const REVIEW_LIVE_EVENT_TYPE = 'reviews';
const LIST_CONTEXT_SELECT = ['id', 'payload', 'poster_path', 'slug', 'title', 'user_id'].join(',');

function normalizeRating(value) {
  if (value === undefined || value === null || value === '') return null;

  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue < 0.5 || parsedValue > 5) {
    throw new Error('Rating must be a number between 0.5 and 5');
  }

  return Math.round(parsedValue * 2) / 2;
}

function normalizeReviewContent(value) {
  return String(value || '').trim();
}

function createListReviewLikeKey(ownerId, listId) {
  return `list:${ownerId}:${listId}`;
}

function buildMediaSubjectMetadata(media = {}) {
  const mediaSnapshot = assertMovieMedia(media, 'Only movie reviews are supported');
  const mediaKey = buildMediaItemKey(mediaSnapshot.entityType, mediaSnapshot.entityId);

  return {
    subjectHref: `/${mediaSnapshot.entityType}/${mediaSnapshot.entityId}`,
    subjectId: mediaSnapshot.entityId,
    subjectKey: mediaKey,
    subjectPoster: media.posterPath || media.poster_path || null,
    subjectTitle: media.title || media.name || 'Untitled',
    subjectType: mediaSnapshot.entityType,
  };
}

function buildListSubjectMetadata({ list = null, listId, ownerId, ownerUsername = null }) {
  const resolvedSlug = list?.slug || listId;
  const resolvedOwnerId = ownerId || list?.ownerId || list?.ownerSnapshot?.id;
  const resolvedOwnerUsername = ownerUsername || list?.ownerSnapshot?.username || resolvedOwnerId;

  return {
    subjectHref: `/account/${resolvedOwnerUsername}/lists/${resolvedSlug}`,
    subjectId: listId || list?.id,
    subjectKey: createListReviewLikeKey(resolvedOwnerId, listId || list?.id),
    subjectOwnerId: resolvedOwnerId,
    subjectOwnerUsername: resolvedOwnerUsername,
    subjectPreviewItems: Array.isArray(list?.previewItems) ? list.previewItems : [],
    subjectPoster: list?.coverUrl || list?.previewItems?.[0]?.poster_path || null,
    subjectSlug: resolvedSlug,
    subjectTitle: list?.title || 'Untitled List',
    subjectType: 'list',
  };
}

function getMediaReviewsSubscriptionKey(media) {
  return buildPollingSubscriptionKey('reviews:media', {
    entityId: media?.entityId ?? media?.id ?? null,
    entityType: media?.entityType ?? media?.media_type ?? null,
  });
}

function getListReviewsSubscriptionKey({ ownerId, listId }) {
  return buildPollingSubscriptionKey('reviews:list', {
    listId,
    ownerId,
  });
}

function normalizeSubjectValue(value) {
  return String(value || '').trim();
}

function dedupeUserIds(userIds = []) {
  return [...new Set(userIds.map((value) => normalizeSubjectValue(value)).filter(Boolean))];
}

function isMatchingMediaReviewEvent(payload = {}, media = null) {
  return (
    normalizeSubjectValue(payload?.subjectType) === normalizeSubjectValue(media?.entityType) &&
    normalizeSubjectValue(payload?.subjectId) === normalizeSubjectValue(media?.entityId || media?.id)
  );
}

function isMatchingListReviewEvent(payload = {}, ownerId, listId) {
  return (
    normalizeSubjectValue(payload?.subjectType) === 'list' &&
    normalizeSubjectValue(payload?.subjectId) === normalizeSubjectValue(listId) &&
    normalizeSubjectValue(payload?.subjectOwnerId) === normalizeSubjectValue(ownerId)
  );
}

function fireReviewLiveEvent(targetUserIds = [], payload = {}) {
  const normalizedTargetUserIds = dedupeUserIds(targetUserIds);

  if (!normalizedTargetUserIds.length) {
    return;
  }

  requestApiJson('/api/live-updates/events', {
    method: 'POST',
    body: {
      eventType: REVIEW_LIVE_EVENT_TYPE,
      payload,
      targetUserIds: normalizedTargetUserIds,
    },
  }).catch((error) => {
    console.error('[ReviewLiveUpdates] Failed to dispatch event:', error);
  });
}

export function getReviewMinLength() {
  return REVIEW_MIN_LENGTH;
}

export function getReviewValidationError({ content, rating }) {
  const normalizedContent = normalizeReviewContent(content);
  const normalizedRating = normalizeRating(rating);

  if (!normalizedContent && normalizedRating === null) {
    return 'Add a score or write a review';
  }

  if (normalizedContent.length > 0 && normalizedContent.length < REVIEW_MIN_LENGTH) {
    return `Review must be at least ${REVIEW_MIN_LENGTH} characters long`;
  }

  return null;
}

export async function fetchUserMediaReviewMap({ items = [], userId, username = null }) {
  if (!userId || !Array.isArray(items) || items.length === 0) {
    return new Map();
  }

  const mediaKeys = items
    .map((item) => createMediaSnapshot(item))
    .filter(
      (mediaSnapshot) =>
        mediaSnapshot.entityType && mediaSnapshot.entityId && isMovieMediaType(mediaSnapshot.entityType)
    )
    .map((mediaSnapshot) => buildMediaItemKey(mediaSnapshot.entityType, mediaSnapshot.entityId));

  if (mediaKeys.length === 0) {
    return new Map();
  }

  const client = getSupabaseClient();
  const entries = [];

  for (let index = 0; index < mediaKeys.length; index += 100) {
    const chunk = mediaKeys.slice(index, index + 100);
    const result = await client
      .from('media_reviews')
      .select('media_key,payload,rating')
      .eq('user_id', userId)
      .in('media_key', chunk);

    assertSupabaseResult(result, 'Reviews could not be loaded');
    (result.data || []).forEach((row) => {
      const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
      const subjectHref = payload.subjectHref || null;

      entries.push([
        row.media_key,
        {
          docPath: `media_items/${row.media_key}/reviews/${userId}`,
          exists: true,
          href: username ? `/account/${username}/reviews` : subjectHref,
          rating: row.rating === null || row.rating === undefined ? null : Number(row.rating),
        },
      ]);
    });
  }

  return new Map(entries);
}

async function fetchMediaReviews(media, limitCount) {
  const mediaSnapshot = createMediaSnapshot(media);

  if (!isMovieMediaType(mediaSnapshot.entityType)) {
    return [];
  }

  const payload = await requestApiJson('/api/reviews', {
    query: {
      entityId: mediaSnapshot.entityId,
      entityType: mediaSnapshot.entityType,
      limitCount,
      resource: 'media',
    },
  });

  return Array.isArray(payload?.data) ? payload.data : [];
}

async function fetchListReviews({ ownerId, listId }, limitCount) {
  if (!ownerId || !listId) {
    return [];
  }

  const payload = await requestApiJson('/api/reviews', {
    query: {
      limitCount,
      listId,
      ownerId,
      resource: 'list',
    },
  });

  return Array.isArray(payload?.data) ? payload.data : [];
}

export function subscribeToMediaReviews(media, callback, options = {}) {
  const limitCount = Number.isFinite(Number(options.limitCount))
    ? Math.max(1, Math.min(Number(options.limitCount), REVIEW_LIMIT))
    : REVIEW_LIMIT;
  const subscriptionKey = getMediaReviewsSubscriptionKey(media);
  const unsubscribeData = createPollingSubscription(() => fetchMediaReviews(media, limitCount), callback, {
    ...options,
    subscriptionKey,
  });
  const liveUserId = options.liveUserId || options.userId || null;
  const unsubscribeLive = liveUserId
    ? subscribeToUserLiveEvent(liveUserId, REVIEW_LIVE_EVENT_TYPE, (payload) => {
        if (!isMatchingMediaReviewEvent(payload, media)) {
          return;
        }

        invalidatePollingSubscription(subscriptionKey, {
          refetch: true,
        });
      })
    : () => {};

  return () => {
    unsubscribeLive();
    unsubscribeData();
  };
}

export function subscribeToListReviews({ list, ownerId, listId }, callback, options = {}) {
  const limitCount = Number.isFinite(Number(options.limitCount))
    ? Math.max(1, Math.min(Number(options.limitCount), REVIEW_LIMIT))
    : REVIEW_LIMIT;
  const subscriptionKey = getListReviewsSubscriptionKey({ list, ownerId, listId });
  const unsubscribeData = createPollingSubscription(
    () => fetchListReviews({ list, ownerId, listId }, limitCount),
    callback,
    {
      ...options,
      subscriptionKey,
    }
  );
  const liveUserId = options.liveUserId || options.userId || null;
  const unsubscribeLive = liveUserId
    ? subscribeToUserLiveEvent(liveUserId, REVIEW_LIVE_EVENT_TYPE, (payload) => {
        if (!isMatchingListReviewEvent(payload, ownerId, listId)) {
          return;
        }

        invalidatePollingSubscription(subscriptionKey, {
          refetch: true,
        });
      })
    : () => {};

  return () => {
    unsubscribeLive();
    unsubscribeData();
  };
}

export async function upsertMediaReview({ media, user, rating = null, content, isSpoiler = false }) {
  const mediaSnapshot = assertMovieMedia(media, 'Only movie reviews are supported');
  const normalizedContent = normalizeReviewContent(content);
  const normalizedRating = normalizeRating(rating);
  const validationError = getReviewValidationError({
    content: normalizedContent,
    rating: normalizedRating,
  });
  const subjectMetadata = buildMediaSubjectMetadata(media);

  if (!mediaSnapshot.entityType || !mediaSnapshot.entityId || !subjectMetadata.subjectTitle) {
    throw new Error('Media reviews require entityType, entityId and title');
  }

  if (!user?.id) {
    throw new Error('Authenticated user is required to submit a review');
  }

  if (validationError) {
    throw new Error(validationError);
  }

  const client = getSupabaseClient();
  const existingResult = await client
    .from('media_reviews')
    .select('created_at,payload')
    .eq('media_key', subjectMetadata.subjectKey)
    .eq('user_id', user.id)
    .maybeSingle();

  assertSupabaseResult(existingResult, 'Review state could not be loaded');

  const existingPayload =
    existingResult.data?.payload && typeof existingResult.data.payload === 'object' ? existingResult.data.payload : {};
  const nowIso = new Date().toISOString();
  const payload = {
    ...existingPayload,
    authorId: user.id,
    content: normalizedContent,
    isSpoiler: normalizedContent ? Boolean(isSpoiler) : false,
    rating: normalizedRating,
    subjectHref: subjectMetadata.subjectHref,
    subjectId: subjectMetadata.subjectId,
    subjectKey: subjectMetadata.subjectKey,
    subjectPoster: subjectMetadata.subjectPoster,
    subjectTitle: subjectMetadata.subjectTitle,
    subjectType: subjectMetadata.subjectType,
    user: {
      avatarUrl: user.avatarUrl || user.photoURL || null,
      email: user.email || null,
      id: user.id,
      name: user.displayName || user.name || user.email || 'Anonymous User',
      username: user.username || null,
    },
  };
  const upsertResult = await client.from('media_reviews').upsert(
    {
      media_key: subjectMetadata.subjectKey,
      user_id: user.id,
      content: normalizedContent,
      rating: normalizedRating,
      is_spoiler: normalizedContent ? Boolean(isSpoiler) : false,
      payload,
      created_at: existingResult.data?.created_at || nowIso,
      updated_at: nowIso,
    },
    { onConflict: 'media_key,user_id' }
  );

  assertSupabaseResult(upsertResult, 'Review could not be saved');

  fireActivityEvent(ACTIVITY_EVENT_TYPES.REVIEW_PUBLISHED, {
    dedupeKey: buildCanonicalActivityDedupeKey({
      actorUserId: user.id,
      subjectId: subjectMetadata.subjectId,
      subjectType: subjectMetadata.subjectType,
    }),
    reviewMode: normalizedContent ? 'review' : 'rating',
    subjectHref: subjectMetadata.subjectHref,
    subjectId: subjectMetadata.subjectId,
    subjectPoster: subjectMetadata.subjectPoster,
    subjectTitle: subjectMetadata.subjectTitle,
    subjectType: subjectMetadata.subjectType,
  });

  invalidatePollingSubscription(getMediaReviewsSubscriptionKey(media), {
    refetch: true,
  });
  fireReviewLiveEvent([user.id], {
    action: existingResult.data ? 'updated' : 'created',
    reviewOwnerId: user.id,
    subjectId: subjectMetadata.subjectId,
    subjectType: subjectMetadata.subjectType,
  });

  return {
    authorId: user.id,
    content: normalizedContent,
    isSpoiler: normalizedContent ? Boolean(isSpoiler) : false,
    mediaKey: subjectMetadata.subjectKey,
    rating: normalizedRating,
    subjectHref: subjectMetadata.subjectHref,
    subjectId: subjectMetadata.subjectId,
    subjectKey: subjectMetadata.subjectKey,
    subjectPoster: subjectMetadata.subjectPoster,
    subjectTitle: subjectMetadata.subjectTitle,
    subjectType: subjectMetadata.subjectType,
  };
}

export async function upsertListReview({ list, ownerId, listId, user, rating = null, content, isSpoiler = false }) {
  const normalizedContent = normalizeReviewContent(content);
  const normalizedRating = normalizeRating(rating);
  const validationError = getReviewValidationError({
    content: normalizedContent,
    rating: normalizedRating,
  });
  const subjectMetadata = buildListSubjectMetadata({
    list,
    listId,
    ownerId,
    ownerUsername: list?.ownerSnapshot?.username || null,
  });

  if (!ownerId || !listId || !subjectMetadata.subjectTitle) {
    throw new Error('List reviews require ownerId, listId, and title');
  }

  if (!user?.id) {
    throw new Error('Authenticated user is required to submit a review');
  }

  if (validationError) {
    throw new Error(validationError);
  }

  const client = getSupabaseClient();
  const existingResult = await client
    .from('list_reviews')
    .select('created_at,payload')
    .eq('list_id', listId)
    .eq('user_id', user.id)
    .maybeSingle();

  assertSupabaseResult(existingResult, 'Review state could not be loaded');

  const existingPayload =
    existingResult.data?.payload && typeof existingResult.data.payload === 'object' ? existingResult.data.payload : {};
  const nowIso = new Date().toISOString();
  const payload = {
    ...existingPayload,
    authorId: user.id,
    content: normalizedContent,
    isSpoiler: normalizedContent ? Boolean(isSpoiler) : false,
    rating: normalizedRating,
    subjectHref: subjectMetadata.subjectHref,
    subjectId: subjectMetadata.subjectId,
    subjectKey: subjectMetadata.subjectKey,
    subjectOwnerId: subjectMetadata.subjectOwnerId,
    subjectOwnerUsername: subjectMetadata.subjectOwnerUsername,
    subjectPreviewItems: subjectMetadata.subjectPreviewItems,
    subjectPoster: subjectMetadata.subjectPoster,
    subjectSlug: subjectMetadata.subjectSlug,
    subjectTitle: subjectMetadata.subjectTitle,
    subjectType: subjectMetadata.subjectType,
    user: {
      avatarUrl: user.avatarUrl || user.photoURL || null,
      email: user.email || null,
      id: user.id,
      name: user.displayName || user.name || user.email || 'Anonymous User',
      username: user.username || null,
    },
  };
  const upsertResult = await client.from('list_reviews').upsert(
    {
      list_id: listId,
      user_id: user.id,
      content: normalizedContent,
      rating: normalizedRating,
      is_spoiler: normalizedContent ? Boolean(isSpoiler) : false,
      payload,
      created_at: existingResult.data?.created_at || nowIso,
      updated_at: nowIso,
    },
    { onConflict: 'list_id,user_id' }
  );

  assertSupabaseResult(upsertResult, 'Review could not be saved');

  if (!existingResult.data) {
    await updateListReviewsCount({
      ownerId,
      listId,
      delta: 1,
    });
  }

  fireActivityEvent(ACTIVITY_EVENT_TYPES.REVIEW_PUBLISHED, {
    dedupeKey: buildCanonicalActivityDedupeKey({
      actorUserId: user.id,
      subjectId: subjectMetadata.subjectId,
      subjectType: subjectMetadata.subjectType,
    }),
    reviewMode: normalizedContent ? 'review' : 'rating',
    subjectHref: subjectMetadata.subjectHref,
    subjectId: subjectMetadata.subjectId,
    subjectOwnerId: subjectMetadata.subjectOwnerId,
    subjectOwnerUsername: subjectMetadata.subjectOwnerUsername,
    subjectPreviewItems: subjectMetadata.subjectPreviewItems,
    subjectPoster: subjectMetadata.subjectPoster,
    subjectSlug: subjectMetadata.subjectSlug,
    subjectTitle: subjectMetadata.subjectTitle,
    subjectType: subjectMetadata.subjectType,
  });

  invalidatePollingSubscription(getListReviewsSubscriptionKey({ list, ownerId, listId }), {
    refetch: true,
  });
  fireReviewLiveEvent([ownerId, user.id], {
    action: existingResult.data ? 'updated' : 'created',
    reviewOwnerId: user.id,
    subjectId: subjectMetadata.subjectId,
    subjectOwnerId: subjectMetadata.subjectOwnerId,
    subjectType: subjectMetadata.subjectType,
  });

  return {
    authorId: user.id,
    content: normalizedContent,
    isSpoiler: normalizedContent ? Boolean(isSpoiler) : false,
    rating: normalizedRating,
    subjectHref: subjectMetadata.subjectHref,
    subjectId: subjectMetadata.subjectId,
    subjectKey: subjectMetadata.subjectKey,
    subjectOwnerId: subjectMetadata.subjectOwnerId,
    subjectOwnerUsername: subjectMetadata.subjectOwnerUsername,
    subjectPreviewItems: subjectMetadata.subjectPreviewItems,
    subjectPoster: subjectMetadata.subjectPoster,
    subjectSlug: subjectMetadata.subjectSlug,
    subjectTitle: subjectMetadata.subjectTitle,
    subjectType: subjectMetadata.subjectType,
  };
}

export async function deleteMediaReview({ media, userId }) {
  if (!media || !userId) {
    throw new Error('Media object and userId are required to delete a review');
  }

  const mediaSnapshot = assertMovieMedia(media, 'Only movie reviews are supported');
  const mediaKey = buildMediaItemKey(mediaSnapshot.entityType, mediaSnapshot.entityId);
  const client = getSupabaseClient();
  const result = await client.from('media_reviews').delete().eq('media_key', mediaKey).eq('user_id', userId);

  assertSupabaseResult(result, 'Review could not be deleted');

  invalidatePollingSubscription(getMediaReviewsSubscriptionKey(media), {
    refetch: true,
  });
  fireReviewLiveEvent([userId], {
    action: 'deleted',
    reviewOwnerId: userId,
    subjectId: mediaSnapshot.entityId,
    subjectType: mediaSnapshot.entityType,
  });

  return true;
}

export async function deleteListReview({ ownerId, listId, userId }) {
  if (!ownerId || !listId || !userId) {
    throw new Error('ownerId, listId, and userId are required');
  }

  const client = getSupabaseClient();
  const existingResult = await client
    .from('list_reviews')
    .select('list_id')
    .eq('list_id', listId)
    .eq('user_id', userId)
    .maybeSingle();

  assertSupabaseResult(existingResult, 'Review state could not be loaded');

  if (!existingResult.data) {
    return false;
  }

  const deleteResult = await client.from('list_reviews').delete().eq('list_id', listId).eq('user_id', userId);

  assertSupabaseResult(deleteResult, 'Review could not be deleted');

  await updateListReviewsCount({
    ownerId,
    listId,
    delta: -1,
  });

  invalidatePollingSubscription(getListReviewsSubscriptionKey({ list: null, ownerId, listId }), {
    refetch: true,
  });
  fireReviewLiveEvent([ownerId, userId], {
    action: 'deleted',
    reviewOwnerId: userId,
    subjectId: listId,
    subjectOwnerId: ownerId,
    subjectType: 'list',
  });

  return true;
}

async function toggleReviewLikeByKey({ reviewKey, reviewUserId, userId }) {
  const client = getSupabaseClient();
  const existingResult = await client
    .from('review_likes')
    .select('media_key')
    .eq('media_key', reviewKey)
    .eq('review_user_id', reviewUserId)
    .eq('user_id', userId)
    .maybeSingle();

  assertSupabaseResult(existingResult, 'Review like state could not be loaded');

  if (existingResult.data) {
    const deleteResult = await client
      .from('review_likes')
      .delete()
      .eq('media_key', reviewKey)
      .eq('review_user_id', reviewUserId)
      .eq('user_id', userId);

    assertSupabaseResult(deleteResult, 'Review like could not be removed');
    return false;
  }

  const insertResult = await client.from('review_likes').insert({
    media_key: reviewKey,
    review_user_id: reviewUserId,
    user_id: userId,
    created_at: new Date().toISOString(),
  });

  assertSupabaseResult(insertResult, 'Review like could not be added');
  return true;
}

export async function toggleReviewLike({ media, reviewUserId, userId }) {
  if (!media || !reviewUserId || !userId) {
    throw new Error('Media, reviewUserId, and userId are required to toggle a like');
  }

  if (reviewUserId === userId) {
    throw new Error('You cannot like your own review');
  }

  const mediaSnapshot = assertMovieMedia(media, 'Only movie reviews are supported');
  const mediaKey = buildMediaItemKey(mediaSnapshot.entityType, mediaSnapshot.entityId);
  const isNowLiked = await toggleReviewLikeByKey({
    reviewKey: mediaKey,
    reviewUserId,
    userId,
  });

  if (isNowLiked) {
    fireNotificationEvent(NOTIFICATION_EVENT_TYPES.REVIEW_LIKED, {
      reviewOwnerId: reviewUserId,
      reviewType: 'media',
      subjectId: mediaSnapshot.entityId,
      subjectTitle: media.title || media.name || '',
      subjectType: mediaSnapshot.entityType,
    });
  }

  invalidatePollingSubscription(getMediaReviewsSubscriptionKey(media), {
    refetch: true,
  });
  fireReviewLiveEvent([reviewUserId, userId], {
    action: isNowLiked ? 'liked' : 'unliked',
    reviewOwnerId: reviewUserId,
    subjectId: mediaSnapshot.entityId,
    subjectType: mediaSnapshot.entityType,
  });

  return isNowLiked;
}

export async function toggleListReviewLike({ ownerId, listId, reviewUserId, userId }) {
  if (!ownerId || !listId || !reviewUserId || !userId) {
    throw new Error('ownerId, listId, reviewUserId, and userId are required to toggle a like');
  }

  if (reviewUserId === userId) {
    throw new Error('You cannot like your own review');
  }

  const reviewKey = createListReviewLikeKey(ownerId, listId);
  const isNowLiked = await toggleReviewLikeByKey({
    reviewKey,
    reviewUserId,
    userId,
  });
  const listContext = isNowLiked ? await getListReviewContext(ownerId, listId) : null;

  if (isNowLiked) {
    fireNotificationEvent(NOTIFICATION_EVENT_TYPES.REVIEW_LIKED, {
      listId,
      listOwnerId: ownerId,
      reviewOwnerId: reviewUserId,
      reviewType: 'list',
      subjectId: listId,
      subjectOwnerId: listContext?.subjectOwnerId || ownerId,
      subjectOwnerUsername: listContext?.subjectOwnerUsername || null,
      subjectSlug: listContext?.subjectSlug || listId,
      subjectTitle: listContext?.subjectTitle || 'Untitled List',
      subjectType: 'list',
    });
  }

  invalidatePollingSubscription(getListReviewsSubscriptionKey({ list: null, ownerId, listId }), {
    refetch: true,
  });
  fireReviewLiveEvent([ownerId, reviewUserId, userId], {
    action: isNowLiked ? 'liked' : 'unliked',
    reviewOwnerId: reviewUserId,
    subjectId: listId,
    subjectOwnerId: listContext?.subjectOwnerId || ownerId,
    subjectType: 'list',
  });

  return isNowLiked;
}

export async function fetchProfileReviewFeed({ cursor = null, mode = 'authored', pageSize = 20, userId }) {
  if (!userId) {
    return {
      hasMore: false,
      items: [],
      nextCursor: null,
    };
  }

  return requestApiJson('/api/account/reviews', {
    query: {
      cursor,
      mode,
      pageSize,
      userId,
    },
  });
}

export async function toggleStoredReviewLike({ review, userId }) {
  if (!review || !userId) {
    throw new Error('review and userId are required');
  }

  if (isListSubjectType(review.subjectType)) {
    return toggleListReviewLike({
      listId: review.subjectId,
      ownerId: review.subjectOwnerId,
      reviewUserId: review.reviewUserId,
      userId,
    });
  }

  if (!isMovieMediaType(review.subjectType)) {
    throw new Error('Only movie reviews are supported');
  }

  return toggleReviewLike({
    media: {
      entityId: review.subjectId,
      entityType: review.subjectType,
      title: review.subjectTitle || 'Untitled',
    },
    reviewUserId: review.reviewUserId,
    userId,
  });
}

export async function deleteStoredReview({ review, userId }) {
  if (!review || !userId) {
    throw new Error('review and userId are required');
  }

  if (isListSubjectType(review.subjectType)) {
    return deleteListReview({
      listId: review.subjectId,
      ownerId: review.subjectOwnerId,
      userId,
    });
  }

  if (!isMovieMediaType(review.subjectType)) {
    throw new Error('Only movie reviews are supported');
  }

  return deleteMediaReview({
    media: {
      entityId: review.subjectId,
      entityType: review.subjectType,
      title: review.subjectTitle || 'Untitled',
    },
    userId,
  });
}

export async function getListReviewContext(ownerId, listId) {
  if (!ownerId || !listId) {
    return null;
  }

  const client = getSupabaseClient();
  const result = await client
    .from('lists')
    .select(LIST_CONTEXT_SELECT)
    .eq('id', listId)
    .eq('user_id', ownerId)
    .maybeSingle();

  assertSupabaseResult(result, 'List context could not be loaded');

  if (!result.data) {
    return null;
  }

  const payload = result.data.payload && typeof result.data.payload === 'object' ? result.data.payload : {};

  return buildListSubjectMetadata({
    list: {
      coverUrl: payload.coverUrl || result.data.poster_path || '',
      id: result.data.id,
      ownerSnapshot: payload.ownerSnapshot || null,
      previewItems: Array.isArray(payload.previewItems) ? payload.previewItems : [],
      slug: result.data.slug || result.data.id,
      title: result.data.title || 'Untitled List',
    },
    listId: result.data.id,
    ownerId,
    ownerUsername: payload?.ownerSnapshot?.username || null,
  });
}
