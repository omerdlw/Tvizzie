'use client';

import {
  buildPollingSubscriptionKey,
  createPollingSubscription,
  invalidatePollingSubscription,
  requestApiJson,
} from '@/core/services/shared/client';
import { subscribeToUserLiveEvent } from '@/core/services/realtime/live-updates.service';
import { createMediaSnapshot } from '@/core/services/shared/media';

import { isTitleMediaType } from '@/core/utils/media';
import { normalizeValue as normalizeSubjectValue } from '@/core/utils/string';

import { REVIEW_LIMIT, REVIEW_LIVE_EVENT_TYPE } from './constants.js';

export function getMediaReviewsSubscriptionKey(media) {
  return buildPollingSubscriptionKey('reviews:media', {
    entityId: media?.entityId ?? media?.id ?? null,
    entityType: media?.entityType ?? media?.media_type ?? null,
  });
}

export function getListReviewsSubscriptionKey({ ownerId, listId }) {
  return buildPollingSubscriptionKey('reviews:list', {
    listId,
    ownerId,
  });
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

export function fireReviewLiveEvent(targetUserIds = [], payload = {}) {
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

async function fetchMediaReviews(media, limitCount) {
  const mediaSnapshot = createMediaSnapshot(media);

  if (!isTitleMediaType(mediaSnapshot.entityType)) {
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
