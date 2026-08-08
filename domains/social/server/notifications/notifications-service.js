'use client';

import {
  buildPollingSubscriptionKey,
  createPollingSubscription,
  invalidatePollingSubscriptions,
} from '@/infrastructure/realtime/polling-subscription-service';
import { NOTIFICATION_TYPES } from '@/domains/social/utils';
import { subscribeToUserLiveEvent } from '@/infrastructure/realtime/live-updates-service';
import { requestApiJson } from '@/infrastructure/http/api-request-service';

const NOTIFICATION_LIMIT = 50;
const NOTIFICATION_SUBSCRIPTION_INTERVAL_MS = 20000;
const NOTIFICATION_SUBSCRIPTION_HIDDEN_INTERVAL_MS = 60000;

import { getNotificationsServer, markNotificationReadServer, removeNotificationServer } from '@/domains/social/api/notifications.server';

async function fetchNotifications(userId, options = {}) {
  if (!userId) {
    return [];
  }

  const res = await getNotificationsServer({
    pageSize: Number.isFinite(Number(options.limitCount))
      ? Math.max(1, Math.min(Number(options.limitCount), 100))
      : NOTIFICATION_LIMIT,
    userId,
  });

  return Array.isArray(res?.items) ? res.items : Array.isArray(res?.data) ? res.data : [];
}

async function fetchUnreadCount(userId) {
  if (!userId) {
    return 0;
  }

  const res = await getNotificationsServer({ userId });
  return Number(res?.unreadCount || res?.data) || 0;
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

export { NOTIFICATION_TYPES };

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

  await markNotificationReadServer({
    notificationId,
    userId,
  });

  refreshNotificationSubscriptions(userId);
}

export async function markAllAsRead(userId) {
  if (!userId) return;

  await markNotificationReadServer({
    action: 'mark-all-read',
    userId,
  });

  refreshNotificationSubscriptions(userId);
}

export async function deleteNotification(userId, notificationId) {
  if (!userId || !notificationId) return;

  await removeNotificationServer({
    notificationId,
    userId,
  });

  refreshNotificationSubscriptions(userId);
}

export async function deleteAllNotifications(userId) {
  if (!userId) return;

  await removeNotificationServer({
    action: 'delete-all',
    userId,
  });

  refreshNotificationSubscriptions(userId);
}
