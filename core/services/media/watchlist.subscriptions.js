'use client';

import { createPollingSubscription } from '@/core/services/shared/polling-subscription.service';
import { fetchWatchlist, fetchWatchlistStatus } from './watchlist.queries';
import { getUserWatchlistSubscriptionKey, getWatchlistStatusSubscriptionKey } from './watchlist.shared';

export function subscribeToWatchlistStatus({ media, userId }, callback, options = {}) {
  return createPollingSubscription(
    () => fetchWatchlistStatus({ media, userId }),
    (result) => {
      callback(Boolean(result?.isInWatchlist), result?.item || null);
    },
    {
      ...options,
      subscriptionKey: getWatchlistStatusSubscriptionKey({ media, userId }),
    }
  );
}

export function subscribeToUserWatchlist(userId, callback, options = {}) {
  return createPollingSubscription(() => fetchWatchlist(userId, options), callback, {
    ...options,
    subscriptionKey: getUserWatchlistSubscriptionKey(userId, options),
  });
}
