'use client';

import { invalidatePollingSubscription, requestApiJson } from '@/core/services/shared/client';
import { assertTitleMedia, buildMediaItemKey } from '@/core/services/shared/media';

import {
  ACTIVITY_EVENT_TYPES,
  fireActivityEvent,
  removeActivityEvents,
} from '@/core/services/activity/activity-events.service';
import { buildCanonicalActivityDedupeKey } from '@/core/services/activity/canonical-key';
import { ACTIVITY_SLOT_TYPES } from '@/core/services/activity/activity-events.constants';
import {
  fireNotificationEvent,
  NOTIFICATION_EVENT_TYPES,
} from '@/core/services/notifications/notification-events.service';
import {
  buildMediaOpinionDedupeKey,
  buildMediaSubjectMetadata,
  buildReviewCardPayload,
  buildReviewLikeActivityPayload,
  normalizeRating,
  normalizeReviewContent,
  unwrapReviewWriteResult,
} from './shared.js';
import { getReviewValidationError } from './validation.js';
import { fireReviewLiveEvent, getMediaReviewsSubscriptionKey } from './subscriptions.js';
import { ensureWatchedBeforeMediaReview, toggleReviewLikeByKey } from './mutation-shared.js';

export async function upsertMediaReview({ media, user, rating = null, content, isSpoiler = false }) {
  const mediaSnapshot = assertTitleMedia(media, 'Only movie and TV reviews are supported');
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

  const nowIso = new Date().toISOString();
  await ensureWatchedBeforeMediaReview({
    hasText: normalizedContent.length > 0,
    media,
    mediaKey: subjectMetadata.subjectKey,
    userId: user.id,
    watchedAt: nowIso,
  });

  const payload = {
    authorId: user.id,
    content: normalizedContent,
    isSpoiler: normalizedContent ? Boolean(isSpoiler) : false,
    rating: normalizedRating,
    ...buildReviewCardPayload({
      content: normalizedContent,
      isSpoiler: normalizedContent ? Boolean(isSpoiler) : false,
      rating: normalizedRating,
      subjectMetadata,
      user,
    }),
  };
  const writePayload = await requestApiJson('/api/reviews/write', {
    method: 'POST',
    body: {
      action: 'upsert-media-review',
      content: normalizedContent,
      isSpoiler: normalizedContent ? Boolean(isSpoiler) : false,
      mediaKey: subjectMetadata.subjectKey,
      payload: {
        ...payload,
        updatedAt: nowIso,
      },
      rating: normalizedRating,
    },
  });
  const writeResult = unwrapReviewWriteResult(writePayload);
  const isCreated = writeResult?.created === true;

  fireActivityEvent(normalizedContent ? ACTIVITY_EVENT_TYPES.REVIEW_PUBLISHED : ACTIVITY_EVENT_TYPES.RATING_LOGGED, {
    dedupeKey: buildMediaOpinionDedupeKey(user.id, subjectMetadata),
    ...buildReviewCardPayload({
      content: normalizedContent,
      isSpoiler: normalizedContent ? Boolean(isSpoiler) : false,
      rating: normalizedRating,
      subjectMetadata,
      user,
    }),
  });

  invalidatePollingSubscription(getMediaReviewsSubscriptionKey(media), {
    refetch: true,
  });
  fireReviewLiveEvent([user.id], {
    action: isCreated ? 'created' : 'updated',
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

export async function deleteMediaReview({ media, userId }) {
  if (!media || !userId) {
    throw new Error('Media object and userId are required to delete a review');
  }

  const mediaSnapshot = assertTitleMedia(media, 'Only movie and TV reviews are supported');
  const mediaKey = buildMediaItemKey(mediaSnapshot.entityType, mediaSnapshot.entityId);
  const writePayload = await requestApiJson('/api/reviews/write', {
    method: 'POST',
    body: {
      action: 'delete-media-review',
      mediaKey,
    },
  });
  const writeResult = unwrapReviewWriteResult(writePayload);
  const deleted = writeResult?.deleted !== false;

  if (deleted) {
    await removeActivityEvents({
      action: 'delete-media-opinion',
      subjectId: mediaSnapshot.entityId,
      subjectType: mediaSnapshot.entityType,
    });
  }

  invalidatePollingSubscription(getMediaReviewsSubscriptionKey(media), {
    refetch: true,
  });
  if (deleted) {
    fireReviewLiveEvent([userId], {
      action: 'deleted',
      reviewOwnerId: userId,
      subjectId: mediaSnapshot.entityId,
      subjectType: mediaSnapshot.entityType,
    });
  }

  return deleted;
}

export async function toggleReviewLike({ media, review = null, reviewUserId, userId }) {
  if (!media || !reviewUserId || !userId) {
    throw new Error('Media, reviewUserId, and userId are required to toggle a like');
  }

  if (reviewUserId === userId) {
    throw new Error('You cannot like your own review');
  }

  const mediaSnapshot = assertTitleMedia(media, 'Only movie and TV reviews are supported');
  const mediaKey = buildMediaItemKey(mediaSnapshot.entityType, mediaSnapshot.entityId);
  const isNowLiked = await toggleReviewLikeByKey({
    reviewKey: mediaKey,
    reviewUserId,
  });

  if (isNowLiked) {
    fireNotificationEvent(NOTIFICATION_EVENT_TYPES.REVIEW_LIKED, {
      reviewOwnerId: reviewUserId,
      reviewType: 'media',
      subjectId: mediaSnapshot.entityId,
      subjectTitle: media.title || media.name || '',
      subjectType: mediaSnapshot.entityType,
    });

    const activityPayload = buildReviewLikeActivityPayload(
      review || {
        rating: null,
        reviewUserId,
        subjectHref: `/${mediaSnapshot.entityType}/${mediaSnapshot.entityId}`,
        subjectId: mediaSnapshot.entityId,
        subjectKey: mediaKey,
        subjectPoster: media?.posterPath || media?.poster_path || null,
        subjectTitle: media.title || media.name || 'Untitled',
        subjectType: mediaSnapshot.entityType,
        user: {
          id: reviewUserId,
          name: 'Anonymous User',
          username: null,
        },
      }
    );

    if (activityPayload) {
      fireActivityEvent(ACTIVITY_EVENT_TYPES.REVIEW_LIKED, {
        ...activityPayload,
        dedupeKey: buildCanonicalActivityDedupeKey({
          actorUserId: userId,
          primaryRef: activityPayload.reviewKey,
          secondaryRef: activityPayload.reviewOwnerId,
          slotType: ACTIVITY_SLOT_TYPES.REVIEW_LIKE,
        }),
      });
    }
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
