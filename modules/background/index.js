'use client'

import { useEffect, useRef } from 'react'

import { AnimatePresence, motion } from 'framer-motion'

import { DURATION, EASING, Z_INDEX } from '@/lib/constants'

import { useTransitionState } from '../transition/context'
import { useBackgroundActions, useBackgroundState } from './context'

export { useBackgroundState, BackgroundProvider } from './context'

export function BackgroundOverlay() {
  const {
    overlayOpacity,
    hasBackground,
    videoOptions,
    overlay,
    isVideo,
    image,
    video,
    videoStyle,
    imageStyle,
    noiseStyle,
    isPlaying,
    position,
  } = useBackgroundState()
  const { setVideoPlaying, setVideoElement } = useBackgroundActions()

  const { backgroundAnimation, isTransitioning } = useTransitionState()

  const videoRef = useRef(null)

  const isMuted = videoOptions?.muted ?? true
  const shouldAutoPlay = videoOptions?.autoplay ?? true
  const isLoop = videoOptions?.loop ?? true
  const playbackRate = videoOptions?.playbackRate ?? 1
  const corp = videoOptions?.corp ?? 0

  const backgroundKey = isVideo ? video : image

  const motionTransition = backgroundAnimation?.transition ?? {
    duration: DURATION.SLOW,
    ease: EASING.EASE_IN_OUT,
  }
  const motionInitial = backgroundAnimation?.initial ?? { opacity: 0 }
  const motionAnimate = backgroundAnimation?.animate ?? { opacity: 1 }
  const motionExit = backgroundAnimation?.exit ?? { opacity: 0 }

  const currentStyle = isVideo ? videoStyle : imageStyle
  const {
    leftGradient = 0,
    rightGradient = 0,
    ...restStyle
  } = currentStyle || {}

  useEffect(() => {
    if (!isVideo || !videoRef.current) return

    const videoEl = videoRef.current
    videoEl.playbackRate = playbackRate
    videoEl.muted = isMuted

    if (isPlaying) {
      if (
        videoEl.duration &&
        corp > 0 &&
        videoEl.currentTime >= videoEl.duration - corp
      ) {
        videoEl.currentTime = 0
      } else if (videoEl.ended) {
        videoEl.currentTime = 0
      }

      videoEl.play().catch((e) => {
        console.warn('Play failed:', e)
        setVideoPlaying(false)
      })
    } else {
      videoEl.pause()
    }

    setVideoElement(videoEl)

    return () => {
      setVideoElement(null)
    }
  }, [
    isVideo,
    video,
    isMuted,
    playbackRate,
    isPlaying,
    setVideoPlaying,
    corp,
    setVideoElement,
  ])

  const handleEnded = () => {
    const videoEl = videoRef.current
    if (videoEl) {
      if (isLoop) {
        videoEl.currentTime = 0
        videoEl.play().catch((e) => console.warn('Loop play failed:', e))
      } else {
        videoEl.pause()
        setVideoPlaying(false)
      }
    }
  }

  const handleTimeUpdate = () => {
    const videoEl = videoRef.current
    if (videoEl && videoEl.duration && corp > 0) {
      if (videoEl.currentTime >= videoEl.duration - corp) {
        handleEnded()
      }
    }
  }

  return (
    <AnimatePresence mode="wait">
      {hasBackground && (
        <motion.div
          key={backgroundKey}
          initial={motionInitial}
          animate={{
            ...motionAnimate,
            transition: motionTransition,
          }}
          exit={{
            ...motionExit,
            transition: {
              ...motionTransition,
              duration: (motionTransition?.duration ?? 0.5) * 0.6,
            },
          }}
          className="pointer-events-none fixed inset-0 transform-gpu"
          style={{
            zIndex: Z_INDEX.BACKGROUND,
            willChange: 'transform, opacity',
          }}
        >
          {isVideo ? (
            <video
              ref={videoRef}
              className="absolute inset-0 mx-auto h-full w-full"
              muted={isMuted}
              loop={isLoop}
              style={{
                ...restStyle,
                filter: restStyle?.filter || undefined,
              }}
              playsInline
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              onLoadedData={() => {
                const videoEl = videoRef.current
                if (!videoEl) return

                videoEl.playbackRate = playbackRate

                if (isMuted && shouldAutoPlay) {
                  videoEl.muted = true
                  videoEl
                    .play()
                    .then(() => setVideoPlaying(true))
                    .catch((e) =>
                      console.warn('Autoplay prevented on load:', e)
                    )
                }
              }}
            >
              <source src={video} type="video/mp4" />
              <source src={video} type="video/webm" />
            </video>
          ) : (
            <div
              className="absolute inset-0 bg-cover bg-no-repeat"
              style={{
                backgroundImage: `url(${image})`,
                backgroundPosition: position,
                ...restStyle,
                filter: restStyle?.filter || undefined,
              }}
            />
          )}
          {Array.from({ length: leftGradient }).map((_, i) => (
            <div
              key={`left-grad-${i}`}
              className="pointer-events-none absolute inset-0 bg-linear-to-r from-black via-transparent to-transparent"
            />
          ))}

          {Array.from({ length: rightGradient }).map((_, i) => (
            <div
              key={`right-grad-${i}`}
              className="pointer-events-none absolute inset-0 bg-linear-to-l from-black via-transparent to-transparent"
            />
          ))}
          <div
            style={{ backgroundImage: `url(/noise.webp)`, ...noiseStyle }}
            className="fixed inset-0 h-screen w-screen transform-gpu bg-cover bg-center mix-blend-overlay"
          />
          {overlay && (
            <div
              style={{ opacity: isTransitioning ? 1 : overlayOpacity }}
              className="absolute inset-0 bg-black transition-opacity duration-300"
            />
          )}
          {!overlay && isTransitioning && (
            <div className="absolute inset-0 bg-black transition-opacity duration-300" />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
