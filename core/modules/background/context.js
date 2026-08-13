'use client';

import { createContext, useCallback, useContext, useLayoutEffect, useState, useMemo } from 'react';

import { REGISTRY_TYPES, useRegistryValue } from '../registry/context';

const BackgroundActionsContext = createContext(null);
const BackgroundStateContext = createContext(null);

const TMDB_IMAGE_VARIANT_PATTERN = /^(https:\/\/image\.tmdb\.org\/t\/p)\/(?:w\d+|h\d+|original)(\/.*)$/i;

const DEFAULT_BACKGROUND = Object.freeze({
  overlayOpacity: 0,
  overlayColor: 'var(--white)',
  position: 'center',
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
  animation: null,
});

function resolveOriginalBackgroundImage(image) {
  if (typeof image !== 'string') {
    return image;
  }

  return image.replace(TMDB_IMAGE_VARIANT_PATTERN, '$1/original$2');
}

function mergeBackgroundState(baseState, patch = {}) {
  const resolvedPatch = Object.hasOwn(patch, 'image')
    ? {
        ...patch,
        image: resolveOriginalBackgroundImage(patch.image),
      }
    : patch;

  return {
    ...baseState,
    ...resolvedPatch,
    imageStyle: {
      ...baseState.imageStyle,
      ...(resolvedPatch.imageStyle || {}),
    },
    videoStyle: {
      ...baseState.videoStyle,
      ...(resolvedPatch.videoStyle || {}),
    },
    noiseStyle: {
      ...baseState.noiseStyle,
      ...(resolvedPatch.noiseStyle || {}),
    },
    videoOptions: {
      ...baseState.videoOptions,
      ...(resolvedPatch.videoOptions || {}),
    },
    animation:
      resolvedPatch.animation !== undefined
        ? resolvedPatch.animation
          ? { ...(baseState.animation || {}), ...resolvedPatch.animation }
          : resolvedPatch.animation
        : baseState.animation,
  };
}

export function BackgroundProvider({ children }) {
  const [background, setBackgroundState] = useState(DEFAULT_BACKGROUND);

  const registryBackground = useRegistryValue(REGISTRY_TYPES.BACKGROUND, 'page-background');

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
      videoStyle: background.videoStyle,
      imageStyle: background.imageStyle,
      noiseStyle: background.noiseStyle,
      isPlaying: background.isPlaying,
      isVideo: Boolean(background.video),
      position: background.position,
      overlay: background.overlay,
      image: background.image,
      video: background.video,
      animation: background.animation,
    }),
    [background],
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
    [setVideoPlaying, setVideoElement, resetBackground, setBackground, toggleVideo, toggleMute],
  );

  return (
    <BackgroundActionsContext.Provider value={actionsValue}>
      <BackgroundStateContext.Provider value={stateValue}>
        {children}
      </BackgroundStateContext.Provider>
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
