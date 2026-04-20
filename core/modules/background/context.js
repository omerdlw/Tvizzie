'use client';

import { createContext, useCallback, useContext, useLayoutEffect, useState, useMemo } from 'react';

import { REGISTRY_TYPES, useRegistryState } from '../registry/context';

const BackgroundActionsContext = createContext(null);
const BackgroundStateContext = createContext(null);

const DEFAULT_BACKGROUND = Object.freeze({
  overlayOpacity: 0.5,
  overlayColor: '#faf9f5',
  position: 'center',
  animation: {
    transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] },
    initial: {},
    animate: {},
    exit: {},
  },
  videoOptions: {
    playbackRate: 1,
    autoplay: true,
    muted: true,
    loop: true,
    corp: 0,
  },
  videoElement: null,
  videoStyle: {},
  imageStyle: {},
  noiseStyle: {},
  overlay: false,
  image: null,
  video: null,
  isPlaying: false,
});

function mergeBackgroundState(baseState, patch = {}) {
  return {
    ...baseState,
    ...patch,
    animation: {
      ...baseState.animation,
      ...(patch.animation || {}),
    },
    imageStyle: {
      ...baseState.imageStyle,
      ...(patch.imageStyle || {}),
    },
    videoStyle: {
      ...baseState.videoStyle,
      ...(patch.videoStyle || {}),
    },
    noiseStyle: {
      ...baseState.noiseStyle,
      ...(patch.noiseStyle || {}),
    },
    videoOptions: {
      ...baseState.videoOptions,
      ...(patch.videoOptions || {}),
    },
  };
}

export function BackgroundProvider({ children }) {
  const [background, setBackgroundState] = useState(DEFAULT_BACKGROUND);

  const { get } = useRegistryState();
  const registryBackground = get(REGISTRY_TYPES.BACKGROUND, 'page-background');

  const setBackground = useCallback((nextBackground) => {
    setBackgroundState((prevState) => mergeBackgroundState(prevState, nextBackground));
  }, []);

  const setVideoPlaying = useCallback((isPlaying) => {
    setBackgroundState((prevState) => ({
      ...prevState,
      isPlaying,
    }));
  }, []);

  const setVideoElement = useCallback((videoElement) => {
    setBackgroundState((prevState) => ({
      ...prevState,
      videoElement,
    }));
  }, []);

  const toggleVideo = useCallback(() => {
    setBackgroundState((prevState) => ({
      ...prevState,
      isPlaying: !prevState.isPlaying,
    }));
  }, []);

  const toggleMute = useCallback(() => {
    setBackgroundState((prevState) => {
      const nextMuted = !prevState.videoOptions?.muted;

      return {
        ...prevState,
        videoOptions: {
          ...prevState.videoOptions,
          muted: nextMuted,
        },
        isPlaying: nextMuted ? prevState.isPlaying : true,
      };
    });
  }, []);

  const resetBackground = useCallback(() => {
    setBackgroundState(DEFAULT_BACKGROUND);
  }, []);

  const setBackgroundFromRegistry = useCallback((registryConfig) => {
    setBackgroundState(mergeBackgroundState(DEFAULT_BACKGROUND, registryConfig));
  }, []);

  useLayoutEffect(() => {
    if (registryBackground) {
      setBackgroundFromRegistry(registryBackground);
      return;
    }

    resetBackground();
  }, [registryBackground, resetBackground, setBackgroundFromRegistry]);

  const stateValue = useMemo(
    () => ({
      hasBackground: Boolean(background.image || background.video),
      overlayOpacity: background.overlayOpacity,
      overlayColor: background.overlayColor,
      videoOptions: background.videoOptions,
      videoElement: background.videoElement,
      animation: background.animation,
      videoStyle: background.videoStyle,
      imageStyle: background.imageStyle,
      noiseStyle: background.noiseStyle,
      isPlaying: background.isPlaying,
      isVideo: Boolean(background.video),
      position: background.position,
      overlay: background.overlay,
      image: background.image,
      video: background.video,
    }),
    [background]
  );

  const actionsValue = useMemo(
    () => ({
      setVideoPlaying,
      setVideoElement,
      resetBackground,
      setBackground,
      toggleVideo,
      toggleMute,
    }),
    [setVideoPlaying, setVideoElement, resetBackground, setBackground, toggleVideo, toggleMute]
  );

  return (
    <BackgroundActionsContext.Provider value={actionsValue}>
      <BackgroundStateContext.Provider value={stateValue}>{children}</BackgroundStateContext.Provider>
    </BackgroundActionsContext.Provider>
  );
}

export function useBackgroundState() {
  const context = useContext(BackgroundStateContext);

  if (!context) {
    throw new Error('useBackgroundState must be within BackgroundProvider');
  }

  return context;
}

export function useBackgroundActions() {
  const context = useContext(BackgroundActionsContext);

  if (!context) {
    throw new Error('useBackgroundActions must be within BackgroundProvider');
  }

  return context;
}

export function useOptionalBackgroundActions() {
  return useContext(BackgroundActionsContext);
}
