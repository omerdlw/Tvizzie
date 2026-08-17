'use client';

import { requestApiJson } from '@/infrastructure/http/api-request-service';
import {
  buildPollingSubscriptionKey,
  createPollingSubscription,
} from '@/infrastructure/realtime/polling-subscription-service';
import {
  ACTIVITY_EVENT_TYPES,
} from '@/domains/social/utils/constants';

async function postActivityEvent({ eventType, payload = {} }) {
  return requestApiJson('/api/activity/events', {
    method: 'POST',
    body: {
      eventType,
      payload,
    },
  });
}

async function deleteActivityEvent(payload = {}) {
  return requestApiJson('/api/activity/events', {
    method: 'DELETE',
    body: payload,
  });
}

export function fireActivityEvent(eventType, payload = {}) {
  void postActivityEvent({ eventType, payload }).catch(() => {});
}

export function removeActivityEvents(payload = {}) {
  return deleteActivityEvent(payload);
}

async function fetchUserActivity(userId, pageSize = null) {
  const result = await fetchAccountActivityFeed({
    pageSize,
    scope: 'user',
    userId,
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

export async function fetchAccountActivityFeed({
  cursor = null,
  pageSize = 20,
  scope = 'user',
  sort = 'newest',
  subject = 'all',
  userId,
}) {
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
      sort,
      subject,
      userId,
    },
  });
}

export { ACTIVITY_EVENT_TYPES };
