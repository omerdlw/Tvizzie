import {
  handleNotificationsDelete,
  handleNotificationsGet,
  handleNotificationsPatch,
} from '@/core/api/routes/notifications.server';

export const GET = handleNotificationsGet;
export const PATCH = handleNotificationsPatch;
export const DELETE = handleNotificationsDelete;
