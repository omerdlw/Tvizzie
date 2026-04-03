'use client'

import { useEffect } from 'react'

import { globalEvents, EVENT_TYPES } from '@/core/constants/events'
import {
  useNotificationActions,
  CRITICAL_TYPES,
} from '@/core/modules/notification/context'

export function NotificationListener() {
  const { showNotification } = useNotificationActions()

  useEffect(() => {
    const unsubscribe = globalEvents.subscribe(
      EVENT_TYPES.API_UNAUTHORIZED,
      (data) => {
        if (data?.source && data.source !== 'app') return

        showNotification(CRITICAL_TYPES.SESSION_EXPIRED, {
          message: 'Your session has expired Please sign in again',
        })
      }
    )

    return unsubscribe
  }, [showNotification])

  return null
}

export function NotificationBadgeListener() {
  // Badge surface is now owned by the dedicated notifications nav action.
  return null
}
