'use client';

import { requestApiJson } from '@/infrastructure/http/api-request-service';
import { NOTIFICATION_EVENT_TYPES } from '@/domains/social/utils';

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

export { NOTIFICATION_EVENT_TYPES };
