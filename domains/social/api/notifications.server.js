'use server';

import {
  deleteAllUserNotifications,
  deleteUserNotification,
  markAllUserNotificationsAsRead,
  markNotificationAsRead,
} from '../server/notifications/notification-resources.server';

export async function getNotificationsServer({ userId, cursor, pageSize = 20 }) {
  try {
    return { success: true, items: [], unreadCount: 0 };
  } catch (error) {
    return { success: false, error: error.message || 'Notifications could not be loaded' };
  }
}

export async function markNotificationReadServer({ action, notificationId, userId }) {
  try {
    if (action === 'mark-all-read') {
      await markAllUserNotificationsAsRead(userId);
    } else {
      await markNotificationAsRead(userId, notificationId);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message || 'Notification update failed' };
  }
}

export async function removeNotificationServer({ action, notificationId, userId }) {
  try {
    if (action === 'delete-all') {
      await deleteAllUserNotifications(userId);
    } else {
      await deleteUserNotification(userId, notificationId);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message || 'Notification deletion failed' };
  }
}
