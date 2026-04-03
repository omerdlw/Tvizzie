'use client'

import { useEffect, useState, useMemo } from 'react'

import { AnimatePresence } from 'framer-motion'

import { Z_INDEX } from '@/core/constants'

import { useNotificationActions, useNotificationState } from './context'
import { NotificationOverlay } from './overlay'

export function NotificationContainer() {
  const { notifications } = useNotificationState()
  const { dismissNotification } = useNotificationActions()

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const sortedNotifications = useMemo(
    () =>
      Object.entries(notifications).sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      ),
    [notifications]
  )

  if (!mounted) return null

  return (
    <div
      className="pointer-events-none fixed top-4 right-4 flex w-full max-w-[400px] flex-col items-end gap-2"
      style={{ zIndex: Z_INDEX.NOTIFICATION }}
    >
      <AnimatePresence mode="popLayout">
        {sortedNotifications.map(([id, notification]) => (
          <NotificationOverlay
            key={id}
            type={notification.type}
            notification={notification}
            onDismiss={() => dismissNotification(id)}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
