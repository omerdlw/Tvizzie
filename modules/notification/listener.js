'use client'

import { useEffect } from 'react'

import { EVENT_TYPES, globalEvents } from '@/lib/events'
import {
  CRITICAL_TYPES,
  useNotificationActions,
} from '@/modules/notification/context'

export function NotificationListener() {
  const { showNotification } = useNotificationActions()

  useEffect(() => {
    const unsubscribers = []

    unsubscribers.push(
      globalEvents.subscribe(EVENT_TYPES.API_UNAUTHORIZED, () => {
        showNotification(CRITICAL_TYPES.SESSION_EXPIRED, {
          message: 'Your session has expired. Please sign in again.',
        })
      })
    )

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe())
    }
  }, [showNotification])

  return null
}
