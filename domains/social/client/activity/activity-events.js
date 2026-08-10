'use client';

import { requestApiJson } from '@/infrastructure/http/api-request-service';
import { ACTIVITY_EVENT_TYPES } from '@/domains/social/utils';

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

export { ACTIVITY_EVENT_TYPES };
