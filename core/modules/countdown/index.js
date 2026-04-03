'use client'

import { useRegistry } from '@/core/modules/registry'

import { useCountdownState } from './context'

export {
  useCountdownActions,
  CountdownProvider,
  useCountdownState,
} from './context'

export function CountdownOverlay() {
  const { isEnabled, config } = useCountdownState()

  useRegistry(
    isEnabled
      ? {
          background: {
            video: config.videoSrc,
            videoOptions: {
              corp: config.videoCorp,
              autoplay: false,
              muted: false,
              loop: true,
            },
            videoStyle: {
              width: config.videoWidth,
              height: '100%',
              scale: 1.12,
              margin: 'auto',
              leftGradient: 3,
              filter: 'grayscale(100%)',
              rightGradient: 3,
              },
            noiseStyle: {
              },
          },
        }
      : {}
  )

  return null
}
