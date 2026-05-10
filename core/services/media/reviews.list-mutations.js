'use client';

import { invalidatePollingSubscription } from '@/core/services/shared/polling-subscription.service';
import { requestApiJson } from '@/core/services/shared/api-request.service';
import {
  ACTIVITY_EVENT_TYPES,
  fireActivityEvent,
  removeActivityEvents,
} from '@/core/services/activity/activity-events.service';
import { buildCanonicalActivityDedupeKey } from '@/core/services/activity/canonical-key';
import { ACTIVITY_SLOT_TYPES } from '@/core/services/activity/activity-events.constants';
import { updateListReviewsCount } from '@/core/services/media/lists.service';
import {
  fireNotificationEvent,
  NOTIFICATION_EVENT_TYPES,
} from '@/core/services/notifications/notification-events.service';
import { getListReviewContext } from './reviews.context';
import {
  buildListOpinionDedupeKey,
  buildListSubjectMetadata,
  buildReviewCardPayload,
  buildReviewLikeActivityPayload,
  createListReviewLikeKey,
  normalizeRating,
  normalizeReviewContent,
  unwrapReviewWriteResult,
} from './reviews.shared';
import { getReviewValidationError } from './reviews.validation';
import { fireReviewLiveEvent, getListReviewsSubscriptionKey } from './reviews.subscriptions';
import { toggleReviewLikeByKey } from './reviews.mutation-shared';

export async function upsertListReview({ list, ownerId, listId, user, rating = null, content, isSpoiler = false }) {
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
  const writePayload = await requestApiJson('/api/reviews/write', {
    method: 'POST',
    body: {
      action: 'upsert-list-review',
      content: normalizedContent,
      isSpoiler: normalizedContent ? Boolean(isSpoiler) : false,
      listId,
      payload: {
        ...payload,
        updatedAt: nowIso,
      },
      rating: null,
    },
  });
  const writeResult = unwrapReviewWriteResult(writePayload);
  const isCreated = writeResult?.created === true;

  if (isCreated) {
    await updateListReviewsCount({
      ownerId,
      listId,
      delta: 1,
    });
  }

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

  const writePayload = await requestApiJson('/api/reviews/write', {
    method: 'POST',
    body: {
      action: 'delete-list-review',
      listId,
    },
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

export async function toggleListReviewLike({ ownerId, listId, review = null, reviewUserId, userId }) {
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

    const activityPayload = buildReviewLikeActivityPayload(
      review ||
        (listContext
          ? {
              rating: null,
              reviewUserId,
              subjectHref: listContext.subjectHref,
              subjectId: listContext.subjectId,
              subjectKey: listContext.subjectKey,
              subjectOwnerId: listContext.subjectOwnerId,
              subjectOwnerUsername: listContext.subjectOwnerUsername,
              subjectPoster: listContext.subjectPoster,
              subjectSlug: listContext.subjectSlug,
              subjectTitle: listContext.subjectTitle,
              subjectType: listContext.subjectType,
              user: {
                id: reviewUserId,
                name: 'Anonymous User',
                username: null,
              },
            }
          : null)
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
    subjectOwnerId: listContext?.subjectOwnerId || ownerId,
    subjectType: 'list',
  });

  return isNowLiked;
}
