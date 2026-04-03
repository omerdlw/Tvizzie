'use client'

import { useEffect, useMemo, useRef } from 'react'

import { AnimatePresence, motion } from 'framer-motion'

import { DURATION, EASING, Z_INDEX } from '@/core/constants'

import { useTransitionState } from '../transition/context'
import { useBackgroundActions, useBackgroundState } from './context'

export { BackgroundProvider, useBackgroundState } from './context'

function getMotionConfig(backgroundAnimation) {
  return {
    transition: backgroundAnimation?.transition ?? {
      duration: DURATION.SLOW,
      ease: EASING.EASE_IN_OUT,
    },
    initial: backgroundAnimation?.initial ?? { opacity: 0 },
    animate: backgroundAnimation?.animate ?? { opacity: 1 },
    exit: backgroundAnimation?.exit ?? { opacity: 0 },
  }
}

function getVisualStyle(currentStyle = {}) {
  const { leftGradient = 0, rightGradient = 0, ...baseStyle } = currentStyle

  return {
    rightGradient,
    leftGradient,
    baseStyle,
  }
}

function shouldRestartFromBeginning(videoElement, corp) {
  if (!videoElement) {
    return false
  }

  if (videoElement.ended) {
    return true
  }

  return Boolean(
    videoElement.duration &&
    corp > 0 &&
    videoElement.currentTime >= videoElement.duration - corp
  )
}

function applyVideoPlaybackState({
  setVideoPlaying,
  playbackRate,
  videoElement,
  isPlaying,
  isMuted,
  corp,
}) {
  if (!videoElement) {
    return
  }

  videoElement.playbackRate = playbackRate
  videoElement.muted = isMuted

  if (!isPlaying) {
    videoElement.pause()
    return
  }

  if (shouldRestartFromBeginning(videoElement, corp)) {
    videoElement.currentTime = 0
  }

  videoElement.play().catch((error) => {
    console.warn('Play failed', error)
    setVideoPlaying(false)
  })
}

function BackgroundGradients({ count, direction }) {
  return Array.from({ length: count }).map((_, index) => (
    <div
      key={`${direction}-${index}`}
      className={
        direction === 'left'
          ? 'pointer-events-none absolute inset-0 bg-linear-to-r from-black via-transparent to-transparent'
          : 'pointer-events-none absolute inset-0 bg-linear-to-l from-black via-transparent to-transparent'
      }
    />
  ))
}

export function BackgroundOverlay() {
  const {
    hasBackground,
    overlayOpacity,
    videoStyle,
    imageStyle,
    videoOptions,
    isPlaying,
    noiseStyle,
    position,
    isVideo,
    overlay,
    image,
    video,
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
  const motionConfig = useMemo(
    () => getMotionConfig(backgroundAnimation),
    [backgroundAnimation]
  )

  const currentStyle = isVideo ? videoStyle : imageStyle
  const { baseStyle, leftGradient, rightGradient } = useMemo(
    () => getVisualStyle(currentStyle),
    [currentStyle]
  )

  useEffect(() => {
    if (!isVideo || !videoRef.current) {
      return
    }

    const videoElement = videoRef.current

    applyVideoPlaybackState({
      videoElement,
      isPlaying,
      isMuted,
      playbackRate,
      corp,
      setVideoPlaying,
    })

    setVideoElement(videoElement)

    return () => {
      setVideoElement(null)
    }
  }, [
    isVideo,
    video,
    isPlaying,
    isMuted,
    playbackRate,
    corp,
    setVideoElement,
    setVideoPlaying,
  ])

  function handleEnded() {
    const videoElement = videoRef.current

    if (!videoElement) {
      return
    }

    if (isLoop) {
      videoElement.currentTime = 0
      videoElement.play().catch((error) => {
        console.warn('Loop play failed', error)
      })
      return
    }

    videoElement.pause()
    setVideoPlaying(false)
  }

  function handleTimeUpdate() {
    const videoElement = videoRef.current

    if (
      videoElement &&
      videoElement.duration &&
      corp > 0 &&
      videoElement.currentTime >= videoElement.duration - corp
    ) {
      handleEnded()
    }
  }

  return (
    <AnimatePresence initial={false} mode="sync">
      {hasBackground && (
        <motion.div
          key={backgroundKey}
          initial={motionConfig.initial}
          animate={{
            ...motionConfig.animate,
            transition: motionConfig.transition,
          }}
          exit={{
            ...motionConfig.exit,
            transition: {
              ...motionConfig.transition,
              duration:
                (motionConfig.transition?.duration ?? DURATION.MODERATE) *
                DURATION.RATIO.EXIT,
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
              preload="metadata"
              muted={isMuted}
              loop={isLoop}
              playsInline
              style={{
                ...baseStyle,
                filter: baseStyle?.filter || undefined,
              }}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              onLoadedData={() => {
                const videoElement = videoRef.current

                if (!videoElement) {
                  return
                }

                videoElement.playbackRate = playbackRate

                if (isMuted && shouldAutoPlay) {
                  videoElement.muted = true
                  videoElement
                    .play()
                    .then(() => setVideoPlaying(true))
                    .catch((error) => {
                      console.warn('Autoplay prevented on load', error)
                    })
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
                ...baseStyle,
                filter: baseStyle?.filter || undefined,
              }}
            />
          )}

          <BackgroundGradients count={leftGradient} direction="left" />
          <BackgroundGradients count={rightGradient} direction="right" />

          <div
            className="fixed inset-0 h-screen w-screen transform-gpu bg-cover bg-center mix-blend-overlay"
            style={{
              backgroundImage: `url(/images/noise.webp)`,
              ...noiseStyle,
            }}
          />

          {overlay && (
            <div
              className="absolute inset-0 bg-black transition-opacity duration-(--motion-duration-normal)"
              style={{ opacity: isTransitioning ? 1 : overlayOpacity }}
            />
          )}

          {!overlay && isTransitioning && (
            <div className="absolute inset-0  transition-opacity duration-(--motion-duration-normal)" />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
