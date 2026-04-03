'use client'

import { useMemo } from 'react'

import {
  useBackgroundActions,
  useBackgroundState,
} from '@/core/modules/background/context'
import { useCountdownState } from '@/core/modules/countdown'

function padCountdownValue(value) {
  return String(value ?? 0).padStart(2, '0')
}

function createCountdownTitle(timeLeft = {}) {
  const days = Number(timeLeft.days) || 0
  const hours = Number(timeLeft.hours) || 0
  const minutes = Number(timeLeft.minutes) || 0

  const dayPrefix = days > 0 ? `${padCountdownValue(days)} days ` : ''

  return `${dayPrefix}${padCountdownValue(hours)} hours ${padCountdownValue(minutes)} minutes`
}

export function useNavigationCountdown() {
  const { isEnabled, timeLeft, config } = useCountdownState()

  const { isVideo, isPlaying } = useBackgroundState()
  const { toggleVideo } = useBackgroundActions()

  const countdownItem = useMemo(() => {
    if (!isEnabled) {
      return null
    }

    return {
      description: config?.announcement || 'Scheduled Maintenance',
      icon: isPlaying ? 'mdi:pause' : 'mdi:play',
      title: createCountdownTitle(timeLeft),
      path: '/countdown',
      name: 'countdown',
      type: 'COUNTDOWN',
      style: {
        title: {
          className: 'font-mono',
        },
      },
      onClick: toggleVideo,
      hideSettings: true,
      hideScroll: true,
      action: null,
      children: null,
    }
  }, [config?.announcement, isEnabled, isPlaying, timeLeft, toggleVideo])

  return {
    isVideo,
    countdownItem,
    toggleBackgroundVideo: toggleVideo,
  }
}
