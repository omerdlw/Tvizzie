'use client'

import { useEffect, useMemo, useState } from 'react'

import { AnimatePresence } from 'framer-motion'

import { Z_INDEX } from '@/lib/constants'

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
      className="pointer-events-none fixed top-4 right-4 flex w-full max-w-[400px] flex-col items-end gap-3"
      style={{ zIndex: Z_INDEX.NOTIFICATION }}
    >
      <AnimatePresence mode="popLayout">
        {sortedNotifications.map(([id, notification]) => (
          <NotificationOverlay
            onDismiss={() => dismissNotification(id)}
            notification={notification}
            type={notification.type}
            key={id}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
