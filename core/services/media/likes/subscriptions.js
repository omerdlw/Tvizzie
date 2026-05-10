'use client';

import { createPollingSubscription } from '@/core/services/shared/polling-subscription.service';
import { fetchLikes, fetchLikeStatus, readFavoriteShowcase } from './queries.js';
import {
  getFavoriteShowcaseSubscriptionKey,
  getLikeStatusSubscriptionKey,
  getUserLikesSubscriptionKey,
} from './shared.js';

export function subscribeToLikeStatus({ media, userId }, callback, options = {}) {
  return createPollingSubscription(
    () => fetchLikeStatus({ media, userId }),
    (result) => {
      callback(Boolean(result?.isLiked), result?.like || null);
    },
    {
      ...options,
      subscriptionKey: getLikeStatusSubscriptionKey({ media, userId }),
    }
  );
}

export function subscribeToUserLikes(userId, callback, options = {}) {
  return createPollingSubscription(() => fetchLikes(userId, options), callback, {
    ...options,
    subscriptionKey: getUserLikesSubscriptionKey(userId, options),
  });
}

export function subscribeToFavoriteShowcase(userId, callback, options = {}) {
  return createPollingSubscription(() => readFavoriteShowcase(userId), callback, {
    ...options,
    subscriptionKey: getFavoriteShowcaseSubscriptionKey(userId),
  });
}
