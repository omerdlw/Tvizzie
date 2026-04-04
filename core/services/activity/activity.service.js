'use client';

import {
  buildPollingSubscriptionKey,
  createPollingSubscription,
} from '@/core/services/shared/polling-subscription.service';
import { requestApiJson } from '@/core/services/shared/api-request.service';

async function fetchUserActivity(userId, pageSize = null) {
  const result = await requestApiJson('/api/account/activity', {
    query: {
      pageSize,
      scope: 'user',
      userId,
    },
  });

  return Array.isArray(result?.items) ? result.items : [];
}

export function subscribeToUserActivity(userId, callback, options = {}) {
  if (!userId) {
    callback([]);
    return () => {};
  }

  return createPollingSubscription(() => fetchUserActivity(userId), callback, {
    ...options,
    subscriptionKey: buildPollingSubscriptionKey('activity:user', {
      hiddenIntervalMs: options.hiddenIntervalMs ?? null,
      intervalMs: options.intervalMs ?? null,
      userId,
    }),
  });
}

export async function fetchUserActivityPage({ cursor = null, pageSize = 20, userId }) {
  if (!userId) {
    return {
      hasMore: false,
      items: [],
      nextCursor: null,
    };
  }

  return requestApiJson('/api/account/activity', {
    query: {
      cursor,
      pageSize,
      scope: 'user',
      userId,
    },
  });
}

export async function fetchAccountActivityFeed({ cursor = null, pageSize = 20, scope = 'user', userId }) {
  if (!userId) {
    return {
      hasMore: false,
      items: [],
      nextCursor: null,
    };
  }

  return requestApiJson('/api/account/activity', {
    query: {
      cursor,
      pageSize,
      scope,
      userId,
    },
  });
}
