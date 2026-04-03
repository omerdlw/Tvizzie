'use client'

import { requestApiJson } from '@/core/services/shared/api-request.service'
import { NOTIFICATION_EVENT_TYPES } from './notification-events.constants'

async function postNotificationEvent({ eventType, payload = {} }) {
  return requestApiJson('/api/notifications/events', {
    method: 'POST',
    body: {
      eventType,
      payload,
    },
  })
}

export function fireNotificationEvent(eventType, payload = {}) {
  return postNotificationEvent({ eventType, payload }).catch((error) => {
    console.error('[NotificationEvents] Failed to dispatch event:', error)
    throw error
  })
}

export { NOTIFICATION_EVENT_TYPES }
