'use client';

import { createPollingSubscription } from '@/core/services/shared/client';
import { fetchWatchlist, fetchWatchlistStatus } from './watchlist.queries.js';
import { getUserWatchlistSubscriptionKey, getWatchlistStatusSubscriptionKey } from './watchlist.shared.js';

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
