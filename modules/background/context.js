'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { DURATION, EASING } from '@/lib/constants'

import { REGISTRY_TYPES, useRegistryState } from '../registry/context'

const BackgroundActionsContext = createContext(null)
const BackgroundStateContext = createContext(null)

const DEFAULT_BACKGROUND = {
  overlayOpacity: 0.5,
  position: 'center',
  overlay: false,
  image: null,
  video: null,
  animation: {
    transition: { duration: DURATION.SLOW, ease: EASING.EASE_IN_OUT },
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  imageStyle: {},
  videoStyle: {},
  noiseStyle: {},
  videoOptions: {
    playbackRate: 1,
    autoplay: true,
    muted: true,
    loop: true,
    corp: 0,
  },
  isPlaying: false,
  videoElement: null,
}

export function BackgroundProvider({ children }) {
  const [background, setBackgroundState] = useState(DEFAULT_BACKGROUND)

  const { get } = useRegistryState()
  const registryBackground = get(REGISTRY_TYPES.BACKGROUND, 'page-background')

  const setBackground = useCallback((newBackground) => {
    setBackgroundState((prev) => ({
      ...prev,
      ...newBackground,
      animation: {
        ...prev.animation,
        ...(newBackground.animation || {}),
      },
      videoStyle: {
        ...prev.videoStyle,
        ...(newBackground.videoStyle || {}),
      },
      imageStyle: {
        ...prev.imageStyle,
        ...(newBackground.imageStyle || {}),
      },
      noiseStyle: {
        ...prev.noiseStyle,
        ...(newBackground.noiseStyle || {}),
      },
      videoOptions: {
        ...prev.videoOptions,
        ...(newBackground.videoOptions || {}),
      },
    }))
  }, [])

  const setVideoPlaying = useCallback((isPlaying) => {
    setBackgroundState((prev) => ({ ...prev, isPlaying }))
  }, [])

  const setVideoElement = useCallback((videoElement) => {
    setBackgroundState((prev) => ({ ...prev, videoElement }))
  }, [])

  const toggleVideo = useCallback(() => {
    setBackgroundState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }))
  }, [])

  const toggleMute = useCallback(() => {
    setBackgroundState((prev) => ({
      ...prev,
      videoOptions: {
        ...prev.videoOptions,
        muted: !prev.videoOptions?.muted,
      },
      isPlaying: prev.videoOptions?.muted ? true : prev.isPlaying,
    }))
  }, [])

  const resetBackground = useCallback(() => {
    setBackgroundState(DEFAULT_BACKGROUND)
  }, [])

  const setBackgroundFromRegistry = useCallback((registryConfig) => {
    setBackgroundState({
      ...DEFAULT_BACKGROUND,
      ...registryConfig,
      animation: {
        ...DEFAULT_BACKGROUND.animation,
        ...(registryConfig.animation || {}),
      },
      videoStyle: {
        ...DEFAULT_BACKGROUND.videoStyle,
        ...(registryConfig.videoStyle || {}),
      },
      imageStyle: {
        ...DEFAULT_BACKGROUND.imageStyle,
        ...(registryConfig.imageStyle || {}),
      },
      noiseStyle: {
        ...DEFAULT_BACKGROUND.noiseStyle,
        ...(registryConfig.noiseStyle || {}),
      },
      videoOptions: {
        ...DEFAULT_BACKGROUND.videoOptions,
        ...(registryConfig.videoOptions || {}),
      },
    })
  }, [])

  useEffect(() => {
    if (registryBackground) {
      setBackgroundFromRegistry(registryBackground)
    } else {
      resetBackground()
    }
  }, [registryBackground, setBackgroundFromRegistry, resetBackground])

  const stateValue = useMemo(
    () => ({
      hasBackground: !!(background.image || background.video),
      overlayOpacity: background.overlayOpacity,
      videoStyle: background.videoStyle,
      imageStyle: background.imageStyle,
      noiseStyle: background.noiseStyle,
      videoOptions: background.videoOptions,
      animation: background.animation,
      position: background.position,
      isVideo: !!background.video,
      overlay: background.overlay,
      image: background.image,
      video: background.video,
      isPlaying: background.isPlaying,
      videoElement: background.videoElement,
    }),
    [background]
  )

  const actionsValue = useMemo(
    () => ({
      resetBackground,
      setBackground,
      setVideoPlaying,
      setVideoElement,
      toggleVideo,
      toggleMute,
    }),
    [
      setBackground,
      resetBackground,
      setVideoPlaying,
      setVideoElement,
      toggleVideo,
      toggleMute,
    ]
  )

  return (
    <BackgroundActionsContext.Provider value={actionsValue}>
      <BackgroundStateContext.Provider value={stateValue}>
        {children}
      </BackgroundStateContext.Provider>
    </BackgroundActionsContext.Provider>
  )
}

export function useBackgroundState() {
  const context = useContext(BackgroundStateContext)
  if (!context)
    throw new Error('useBackgroundState must be within BackgroundProvider')
  return context
}

export function useBackgroundActions() {
  const context = useContext(BackgroundActionsContext)
  if (!context)
    throw new Error('useBackgroundActions must be within BackgroundProvider')
  return context
}
