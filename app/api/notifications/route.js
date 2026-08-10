import {
  handleNotificationsDelete,
  handleNotificationsGet,
  handleNotificationsPatch,
} from '@/domains/social/server/notifications/route.server';

export const GET = handleNotificationsGet;
export const PATCH = handleNotificationsPatch;
export const DELETE = handleNotificationsDelete;
