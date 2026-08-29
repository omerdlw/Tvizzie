'use client';

import {
  buildPollingSubscriptionKey,
  createPollingSubscription,
  invalidatePollingSubscriptions,
} from '@/infrastructure/realtime/client';
import { subscribeToUserLiveEvent } from '@/infrastructure/realtime/client';
import { requestApiJson } from '@/infrastructure/http/client';
import { NOTIFICATION_EVENT_TYPES, NOTIFICATION_TYPES } from '@/domains/social/utils/constants';

const NOTIFICATION_LIMIT = 50;
const NOTIFICATION_SUBSCRIPTION_INTERVAL_MS = 60000;
const NOTIFICATION_SUBSCRIPTION_HIDDEN_INTERVAL_MS = 180000;

async function postNotificationEvent({ eventType, payload = {} }) {
  return requestApiJson('/api/notifications/events', {
    method: 'POST',
    body: {
      eventType,
      payload,
    },
  });
}

export function fireNotificationEvent(eventType, payload = {}) {
  void postNotificationEvent({ eventType, payload }).catch(() => {});
}

async function fetchNotifications(userId, options = {}) {
  if (!userId) {
    return [];
  }

  const data = await requestApiJson('/api/notifications', {
    query: {
      limitCount: Number.isFinite(Number(options.limitCount))
        ? Math.max(1, Math.min(Number(options.limitCount), 100))
        : NOTIFICATION_LIMIT,
    },
  });

  return Array.isArray(data?.data) ? data.data : [];
}

async function fetchUnreadCount(userId) {
  if (!userId) {
    return 0;
  }

  const data = await requestApiJson('/api/notifications', {
    query: {
      resource: 'unread-count',
    },
  });

  return Number(data?.data) || 0;
}

function getNotificationsListSubscriptionKey(userId, options = {}) {
  return buildPollingSubscriptionKey('notifications:list', {
    limitCount: options.limitCount ?? null,
    userId,
  });
}

function getUnreadCountSubscriptionKey(userId) {
  return buildPollingSubscriptionKey('notifications:unread-count', {
    userId,
  });
}

function refreshNotificationSubscriptions(userId, options = {}) {
  invalidatePollingSubscriptions(
    [getNotificationsListSubscriptionKey(userId, options), getUnreadCountSubscriptionKey(userId)],
    { refetch: true },
  );
}

export function subscribeToNotifications(userId, callback, options = {}) {
  if (!userId) {
    callback([]);
    return () => {};
  }

  const unsubscribeData = createPollingSubscription(
    () => fetchNotifications(userId, options),
    callback,
    {
      ...options,
      hiddenIntervalMs: options.hiddenIntervalMs ?? NOTIFICATION_SUBSCRIPTION_HIDDEN_INTERVAL_MS,
      intervalMs: options.intervalMs ?? NOTIFICATION_SUBSCRIPTION_INTERVAL_MS,
      subscriptionKey: getNotificationsListSubscriptionKey(userId, options),
    },
  );

  const unsubscribeLive = subscribeToUserLiveEvent(userId, 'notifications', () => {
    refreshNotificationSubscriptions(userId, options);
  });
  const unsubscribeFollowLive = subscribeToUserLiveEvent(userId, 'follows', () => {
    refreshNotificationSubscriptions(userId, options);
  });

  return () => {
    unsubscribeFollowLive();
    unsubscribeLive();
    unsubscribeData();
  };
}

export function subscribeToUnreadCount(userId, callback, options = {}) {
  if (!userId) {
    callback(0);
    return () => {};
  }

  const unsubscribeData = createPollingSubscription(() => fetchUnreadCount(userId), callback, {
    ...options,
    hiddenIntervalMs: options.hiddenIntervalMs ?? NOTIFICATION_SUBSCRIPTION_HIDDEN_INTERVAL_MS,
    intervalMs: options.intervalMs ?? NOTIFICATION_SUBSCRIPTION_INTERVAL_MS,
    subscriptionKey: getUnreadCountSubscriptionKey(userId),
  });

  const unsubscribeLive = subscribeToUserLiveEvent(userId, 'notifications', () => {
    refreshNotificationSubscriptions(userId, options);
  });
  const unsubscribeFollowLive = subscribeToUserLiveEvent(userId, 'follows', () => {
    refreshNotificationSubscriptions(userId, options);
  });

  return () => {
    unsubscribeFollowLive();
    unsubscribeLive();
    unsubscribeData();
  };
}

export async function markAsRead(userId, notificationId) {
  if (!userId || !notificationId) return;

  await requestApiJson('/api/notifications', {
    body: {
      action: 'mark-read',
      notificationId,
    },
    method: 'PATCH',
  });

  refreshNotificationSubscriptions(userId);
}

export async function markAllAsRead(userId) {
  if (!userId) return;

  await requestApiJson('/api/notifications', {
    body: {
      action: 'mark-all-read',
    },
    method: 'PATCH',
  });

  refreshNotificationSubscriptions(userId);
}

export async function deleteNotification(userId, notificationId) {
  if (!userId || !notificationId) return;

  await requestApiJson('/api/notifications', {
    method: 'DELETE',
    query: {
      action: 'delete',
      notificationId,
    },
  });

  refreshNotificationSubscriptions(userId);
}

export async function deleteAllNotifications(userId) {
  if (!userId) return;

  await requestApiJson('/api/notifications', {
    method: 'DELETE',
    query: {
      action: 'delete-all',
    },
  });

  refreshNotificationSubscriptions(userId);
}

export { NOTIFICATION_TYPES, NOTIFICATION_EVENT_TYPES };
