'use client'

import { useEffect, useState } from 'react'

import { NAV_EVENT_HANDLERS } from '../events'

export function useNavBadge(navKey, initialBadge) {
  const [badge, setBadge] = useState({
    visible: !!initialBadge,
    value: initialBadge,
    color: 'bg-primary',
  })

  useEffect(() => {
    const unsubscribe = NAV_EVENT_HANDLERS.onBadgeUpdate((data) => {
      if (data.key === navKey) {
        setBadge({
          visible:
            data.value !== undefined &&
            data.value !== null &&
            data.value !== '',
          color: data.color,
          value: data.value,
        })
      }
    })
    return () => unsubscribe()
  }, [navKey])

  return badge
}
