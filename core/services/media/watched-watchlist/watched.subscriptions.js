'use client';

import { createPollingSubscription } from '@/core/services/shared/polling-subscription.service.js';
import { fetchWatchedList, fetchWatchedStatus } from './watched.queries.js';
import { getUserWatchedSubscriptionKey, getWatchedStatusSubscriptionKey } from './watched.shared.js';

export function subscribeToWatchedStatus({ media, userId }, callback, options = {}) {
  return createPollingSubscription(
    () => fetchWatchedStatus({ media, userId }),
    (result) => {
      callback(Boolean(result?.isWatched), result?.watched || null);
    },
    {
      ...options,
      subscriptionKey: getWatchedStatusSubscriptionKey({ media, userId }),
    }
  );
}

export function subscribeToUserWatched(userId, callback, options = {}) {
  if (!userId) {
    callback([]);
    return () => {};
  }

  return createPollingSubscription(() => fetchWatchedList(userId, options), callback, {
    ...options,
    subscriptionKey: getUserWatchedSubscriptionKey(userId),
  });
}
