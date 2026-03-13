'use client'

import { useMemo } from 'react'

import {
  useBackgroundActions,
  useBackgroundState,
} from '@/modules/background/context'
import { useCountdownState } from '@/modules/countdown'

function padCountdownValue(value) {
  return String(value).padStart(2, '0')
}

function createCountdownTitle(timeLeft) {
  return `${timeLeft.days ? `${padCountdownValue(timeLeft.days)} days ` : ''}${padCountdownValue(timeLeft.hours)} hours ${padCountdownValue(timeLeft.minutes)} minutes`
}

export function useNavigationCountdown() {
  const {
    isEnabled: isCountdownEnabled,
    timeLeft,
    config: countdownConfig,
  } = useCountdownState()
  const { isVideo, isPlaying: isBackgroundPlaying } = useBackgroundState()
  const { toggleVideo: toggleBackgroundVideo } = useBackgroundActions()

  const countdownItem = useMemo(() => {
    if (!isCountdownEnabled) return null

    return {
      type: 'COUNTDOWN',
      name: 'countdown',
      path: '/countdown',
      title: createCountdownTitle(timeLeft),
      description: countdownConfig?.announcement || 'Scheduled Maintenance',
      icon: isBackgroundPlaying ? 'mdi:pause' : 'mdi:play',
      style: {
        title: {
          className: 'font-mono',
        },
      },
      hideSettings: true,
      hideScroll: true,
      action: null,
      onClick: toggleBackgroundVideo,
      children: null,
    }
  }, [
    countdownConfig,
    isBackgroundPlaying,
    isCountdownEnabled,
    timeLeft,
    toggleBackgroundVideo,
  ])

  return {
    isVideo,
    countdownItem,
    toggleBackgroundVideo,
  }
}
