'use client';

import {
  createPollingSubscription,
  invalidatePollingSubscription,
} from '@/infrastructure/realtime/client';
import { requestApiJson } from '@/infrastructure/http/client';
import { subscribeToUserLiveEvent } from '@/infrastructure/realtime/client';
import { normalizeValue as normalizeSubjectValue } from '@/shared';
import { REVIEW_LIMIT, REVIEW_LIVE_EVENT_TYPE } from '@/domains/reviews/utils/constants';
import {
  fetchListReviews,
  fetchMediaReviews,
  getListReviewsSubscriptionKey,
  getMediaReviewsSubscriptionKey,
} from './queries.js';

export { getListReviewsSubscriptionKey, getMediaReviewsSubscriptionKey };

function dedupeUserIds(userIds = []) {
  return [...new Set(userIds.map((value) => normalizeSubjectValue(value)).filter(Boolean))];
}

function isMatchingMediaReviewEvent(payload = {}, media = null) {
  return (
    normalizeSubjectValue(payload?.subjectType) === normalizeSubjectValue(media?.entityType) &&
    normalizeSubjectValue(payload?.subjectId) ===
      normalizeSubjectValue(media?.entityId || media?.id)
  );
}

function isMatchingListReviewEvent(payload = {}, ownerId, listId) {
  return (
    normalizeSubjectValue(payload?.subjectType) === 'list' &&
    normalizeSubjectValue(payload?.subjectId) === normalizeSubjectValue(listId) &&
    normalizeSubjectValue(payload?.subjectOwnerId) === normalizeSubjectValue(ownerId)
  );
}

export function fireReviewLiveEvent(targetUserIds = [], payload = {}) {
  const normalizedTargetUserIds = dedupeUserIds(targetUserIds);

  if (!normalizedTargetUserIds.length) {
    return;
  }

  void requestApiJson('/api/live-updates/events', {
    method: 'POST',
    body: {
      eventType: REVIEW_LIVE_EVENT_TYPE,
      payload,
      targetUserIds: normalizedTargetUserIds,
    },
  }).catch(() => {});
}

export function subscribeToMediaReviews(media, callback, options = {}) {
  const limitCount = Number.isFinite(Number(options.limitCount))
    ? Math.max(1, Math.min(Number(options.limitCount), REVIEW_LIMIT))
    : REVIEW_LIMIT;
  const subscriptionKey = getMediaReviewsSubscriptionKey(media);
  const unsubscribeData = createPollingSubscription(
    () => fetchMediaReviews(media, limitCount),
    callback,
    {
      ...options,
      subscriptionKey,
    },
  );
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
    },
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
