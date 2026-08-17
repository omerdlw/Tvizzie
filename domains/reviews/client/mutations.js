'use client';

import { requestApiJson } from '@/infrastructure/http/api-request-service';
import { invalidatePollingSubscription } from '@/infrastructure/realtime/polling-subscription-service';
import {
  assertTitleMedia,
  buildMediaItemKey,
} from '@/domains/media/utils/media-key';
import {
  isListSubjectType,
  isTitleMediaType,
} from '@/domains/media/utils/media-key';
import {
  ACTIVITY_EVENT_TYPES,
} from '@/domains/social/client/activity';
import {
  ACTIVITY_SLOT_TYPES,
} from '@/domains/social/utils/constants';
import {
  buildCanonicalActivityDedupeKey,
} from '@/domains/social/utils/formatting';
import {
  fireActivityEvent,
  removeActivityEvents,
} from '@/domains/social/client/activity';
import {
  fireNotificationEvent,
  NOTIFICATION_EVENT_TYPES,
} from '@/domains/social/client/notifications';
import {
  buildListOpinionDedupeKey,
  buildListSubjectMetadata,
  buildMediaOpinionDedupeKey,
  buildMediaSubjectMetadata,
  buildReviewCardPayload,
  buildReviewLikeActivityPayload,
  createListReviewLikeKey,
  normalizeRating,
  normalizeReviewContent,
  unwrapReviewWriteResult,
} from '@/domains/reviews/utils/formatting';
import {
  getReviewValidationError,
} from '@/domains/reviews/utils/validation';
import {
  fireReviewLiveEvent,
  getListReviewsSubscriptionKey,
  getMediaReviewsSubscriptionKey,
} from './subscriptions.js';

export async function executeReviewWrite({ action, ...body }) {
  return requestApiJson('/api/reviews/write', {
    method: 'POST',
    body: {
      action,
      ...body,
    },
  });
}

export async function toggleReviewLikeByKey({ reviewKey, reviewUserId }) {
  const writePayload = await executeReviewWrite({
    action: 'toggle-review-like',
    reviewKey,
    reviewUserId,
  });
  const writeResult = unwrapReviewWriteResult(writePayload);

  return writeResult?.isNowLiked === true;
}

export async function upsertListReview({
  list,
  ownerId,
  listId,
  user,
  rating = null,
  content,
  isSpoiler = false,
}) {
  const normalizedContent = normalizeReviewContent(content);
  const normalizedRating = normalizeRating(rating);
  const validationError = getReviewValidationError({
    content: normalizedContent,
    rating: normalizedRating,
    allowRating: false,
    requireText: true,
    textLabel: 'comment',
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

  const nowIso = new Date().toISOString();
  const payload = {
    authorId: user.id,
    content: normalizedContent,
    isSpoiler: normalizedContent ? Boolean(isSpoiler) : false,
    rating: null,
    ...buildReviewCardPayload({
      content: normalizedContent,
      isSpoiler: normalizedContent ? Boolean(isSpoiler) : false,
      rating: null,
      subjectMetadata,
      user,
    }),
  };

  const writePayload = await executeReviewWrite({
    action: 'upsert-list-review',
    content: normalizedContent,
    isSpoiler: normalizedContent ? Boolean(isSpoiler) : false,
    listId,
    payload: {
      ...payload,
      updatedAt: nowIso,
    },
    rating: null,
  });
  const writeResult = unwrapReviewWriteResult(writePayload);
  const isCreated = writeResult?.created === true;

  fireActivityEvent(ACTIVITY_EVENT_TYPES.LIST_COMMENTED, {
    dedupeKey: buildListOpinionDedupeKey(user.id, subjectMetadata),
    ...buildReviewCardPayload({
      content: normalizedContent,
      isSpoiler: normalizedContent ? Boolean(isSpoiler) : false,
      rating: null,
      subjectMetadata,
      user,
    }),
  });

  if (isCreated && ownerId !== user.id) {
    fireNotificationEvent(NOTIFICATION_EVENT_TYPES.LIST_COMMENTED, {
      listId,
      listOwnerId: ownerId,
      subjectId: subjectMetadata.subjectId,
      subjectOwnerId: subjectMetadata.subjectOwnerId || ownerId,
      subjectOwnerUsername: subjectMetadata.subjectOwnerUsername || null,
      subjectSlug: subjectMetadata.subjectSlug || listId,
      subjectTitle: subjectMetadata.subjectTitle || 'Untitled List',
      subjectType: 'list',
    });
  }

  invalidatePollingSubscription(getListReviewsSubscriptionKey({ list, ownerId, listId }), {
    refetch: true,
  });
  fireReviewLiveEvent([ownerId, user.id], {
    action: isCreated ? 'created' : 'updated',
    reviewOwnerId: user.id,
    subjectId: subjectMetadata.subjectId,
    subjectOwnerId: subjectMetadata.subjectOwnerId,
    subjectType: subjectMetadata.subjectType,
  });

  return {
    authorId: user.id,
    content: normalizedContent,
    isSpoiler: normalizedContent ? Boolean(isSpoiler) : false,
    rating: null,
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

export async function deleteListReview({ ownerId, listId, userId }) {
  if (!ownerId || !listId || !userId) {
    throw new Error('ownerId, listId, and userId are required');
  }

  const writePayload = await executeReviewWrite({
    action: 'delete-list-review',
    listId,
  });
  const writeResult = unwrapReviewWriteResult(writePayload);
  const deleted = writeResult?.deleted === true;

  if (!deleted) {
    return false;
  }

  await removeActivityEvents({
    action: 'delete-list-opinion',
    listId,
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

export async function toggleListReviewLike({
  ownerId,
  listId,
  review = null,
  reviewUserId,
  userId,
}) {
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
  });
  const subjectMetadata = isNowLiked
    ? buildListSubjectMetadata({
        list: review
          ? {
              coverUrl: review.subjectPoster,
              id: listId,
              ownerSnapshot: {
                id: ownerId,
                username: review.subjectOwnerUsername || ownerId,
              },
              previewItems: review.subjectPreviewItems,
              slug: review.subjectSlug || listId,
              title: review.subjectTitle,
            }
          : null,
        listId,
        ownerId,
        ownerUsername: review?.subjectOwnerUsername || ownerId,
      })
    : null;

  if (isNowLiked) {
    fireNotificationEvent(NOTIFICATION_EVENT_TYPES.REVIEW_LIKED, {
      listId,
      listOwnerId: ownerId,
      reviewOwnerId: reviewUserId,
      reviewType: 'list',
      subjectId: listId,
      subjectOwnerId: subjectMetadata?.subjectOwnerId || ownerId,
      subjectOwnerUsername: subjectMetadata?.subjectOwnerUsername || null,
      subjectSlug: subjectMetadata?.subjectSlug || listId,
      subjectTitle: subjectMetadata?.subjectTitle || 'Untitled List',
      subjectType: 'list',
    });

    const activityPayload = buildReviewLikeActivityPayload(
      review ||
        (subjectMetadata
          ? {
              rating: null,
              reviewUserId,
              subjectHref: subjectMetadata.subjectHref,
              subjectId: subjectMetadata.subjectId,
              subjectKey: subjectMetadata.subjectKey,
              subjectOwnerId: subjectMetadata.subjectOwnerId,
              subjectOwnerUsername: subjectMetadata.subjectOwnerUsername,
              subjectPoster: subjectMetadata.subjectPoster,
              subjectSlug: subjectMetadata.subjectSlug,
              subjectTitle: subjectMetadata.subjectTitle,
              subjectType: subjectMetadata.subjectType,
              user: {
                id: reviewUserId,
                name: 'Anonymous User',
                username: null,
              },
            }
          : null),
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

  invalidatePollingSubscription(getListReviewsSubscriptionKey({ list: null, ownerId, listId }), {
    refetch: true,
  });
  fireReviewLiveEvent([ownerId, reviewUserId, userId], {
    action: isNowLiked ? 'liked' : 'unliked',
    reviewOwnerId: reviewUserId,
    subjectId: listId,
    subjectOwnerId: subjectMetadata?.subjectOwnerId || ownerId,
    subjectType: 'list',
  });

  return isNowLiked;
}

export async function upsertMediaReview({
  media,
  user,
  rating = null,
  content,
  isSpoiler = false,
}) {
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

  const writePayload = await executeReviewWrite({
    action: 'upsert-media-review',
    content: normalizedContent,
    isSpoiler: normalizedContent ? Boolean(isSpoiler) : false,
    media,
    mediaKey: subjectMetadata.subjectKey,
    payload: {
      ...payload,
      updatedAt: nowIso,
    },
    rating: normalizedRating,
  });
  const writeResult = unwrapReviewWriteResult(writePayload);
  const isCreated = writeResult?.created === true;

  fireActivityEvent(
    normalizedContent ? ACTIVITY_EVENT_TYPES.REVIEW_PUBLISHED : ACTIVITY_EVENT_TYPES.RATING_LOGGED,
    {
      dedupeKey: buildMediaOpinionDedupeKey(user.id, subjectMetadata),
      ...buildReviewCardPayload({
        content: normalizedContent,
        isSpoiler: normalizedContent ? Boolean(isSpoiler) : false,
        rating: normalizedRating,
        subjectMetadata,
        user,
      }),
    },
  );

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
  const writePayload = await executeReviewWrite({
    action: 'delete-media-review',
    mediaKey,
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
      },
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

export async function toggleStoredReviewLike({ review, userId }) {
  if (!review || !userId) {
    throw new Error('review and userId are required');
  }

  if (isListSubjectType(review.subjectType)) {
    return toggleListReviewLike({
      listId: review.subjectId,
      ownerId: review.subjectOwnerId,
      review,
      reviewUserId: review.reviewUserId,
      userId,
    });
  }

  if (!isTitleMediaType(review.subjectType)) {
    throw new Error('Only movie and TV reviews are supported');
  }

  return toggleReviewLike({
    media: {
      entityId: review.subjectId,
      entityType: review.subjectType,
      title: review.subjectTitle || 'Untitled',
    },
    review,
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

  if (!isTitleMediaType(review.subjectType)) {
    throw new Error('Only movie and TV reviews are supported');
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
