'use client';

import { invalidatePollingSubscription } from '@/infrastructure/realtime/polling-subscription-service';
import {
  ACTIVITY_EVENT_TYPES,
  fireActivityEvent,
  removeActivityEvents,
} from '@/domains/social/client/activity/activity-events';
import { buildCanonicalActivityDedupeKey } from '@/domains/social/utils';
import { ACTIVITY_SLOT_TYPES } from '@/domains/social/utils';
import {
  fireNotificationEvent,
  NOTIFICATION_EVENT_TYPES,
} from '@/domains/social/client/notifications/notification-events';
import {
  buildListOpinionDedupeKey,
  buildListSubjectMetadata,
  buildReviewCardPayload,
  buildReviewLikeActivityPayload,
  createListReviewLikeKey,
  normalizeRating,
  normalizeReviewContent,
  unwrapReviewWriteResult,
} from '@/domains/reviews/shared/review-utils';
import { getReviewValidationError } from '@/domains/reviews/shared/review-validation';
import { fireReviewLiveEvent, getListReviewsSubscriptionKey } from './review-subscriptions.js';
import { executeReviewWrite } from './review-write-client.js';
import { toggleReviewLikeByKey } from './review-like-mutations.js';

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
