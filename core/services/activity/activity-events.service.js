'use client';

import { requestApiJson } from '@/core/services/shared/api-request.service';
import { ACTIVITY_EVENT_TYPES } from './activity-events.constants';

async function postActivityEvent({ eventType, payload = {} }) {
  return requestApiJson('/api/activity/events', {
    method: 'POST',
    body: {
      eventType,
      payload,
    },
  });
}

export function fireActivityEvent(eventType, payload = {}) {
  return postActivityEvent({ eventType, payload }).catch((error) => {
    console.error('[ActivityEvents] Failed to dispatch event:', error);
    throw error;
  });
}

export { ACTIVITY_EVENT_TYPES };
