'use client';

import {
  buildPollingSubscriptionKey,
  createPollingSubscription,
  invalidatePollingSubscriptions,
} from '@/core/services/shared/polling-subscription.service';
import { NOTIFICATION_TYPES } from '@/core/services/notifications/notifications.constants';
import { subscribeToUserLiveEvent } from '@/core/services/realtime/live-updates.service';
import { requestApiJson } from '@/core/services/shared/api-request.service';

const NOTIFICATION_LIMIT = 50;

async function fetchNotifications(userId, options = {}) {
  if (!userId) {
    return [];
  }

  const payload = await requestApiJson('/api/notifications', {
    query: {
      limitCount: Number.isFinite(Number(options.limitCount))
        ? Math.max(1, Math.min(Number(options.limitCount), 100))
        : NOTIFICATION_LIMIT,
      resource: 'list',
    },
  });

  return Array.isArray(payload?.data) ? payload.data : [];
}

async function fetchUnreadCount(userId) {
  if (!userId) {
    return 0;
  }

  const payload = await requestApiJson('/api/notifications', {
    query: {
      resource: 'unread-count',
    },
  });

  return Number(payload?.data) || 0;
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
    { refetch: true }
  );
}

export { NOTIFICATION_TYPES };

export function subscribeToNotifications(userId, callback, options = {}) {
  if (!userId) {
    callback([]);
    return () => {};
  }

  const unsubscribeData = createPollingSubscription(() => fetchNotifications(userId, options), callback, {
    ...options,
    subscriptionKey: getNotificationsListSubscriptionKey(userId, options),
  });

  const unsubscribeLive = subscribeToUserLiveEvent(userId, 'notifications', () => {
    refreshNotificationSubscriptions(userId, options);
  });

  return () => {
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
    subscriptionKey: getUnreadCountSubscriptionKey(userId),
  });

  const unsubscribeLive = subscribeToUserLiveEvent(userId, 'notifications', () => {
    refreshNotificationSubscriptions(userId, options);
  });

  return () => {
    unsubscribeLive();
    unsubscribeData();
  };
}

export async function markAsRead(userId, notificationId) {
  if (!userId || !notificationId) return;

  await requestApiJson('/api/notifications', {
    method: 'PATCH',
    body: {
      notificationId,
    },
  });

  refreshNotificationSubscriptions(userId);
}

export async function markAllAsRead(userId) {
  if (!userId) return;

  await requestApiJson('/api/notifications', {
    method: 'PATCH',
    body: {
      action: 'mark-all-read',
    },
  });

  refreshNotificationSubscriptions(userId);
}

export async function deleteNotification(userId, notificationId) {
  if (!userId || !notificationId) return;

  await requestApiJson('/api/notifications', {
    method: 'DELETE',
    query: {
      notificationId,
    },
  });

  refreshNotificationSubscriptions(userId);
}
