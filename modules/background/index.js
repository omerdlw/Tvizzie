'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { REGISTRY_TYPES, useRegistryValue } from '@/modules/registry';
import { Z_INDEX } from '@/shared';

const BackgroundActionsContext = createContext(null);
const BackgroundStateContext = createContext(null);

const TMDB_IMAGE_VARIANT_PATTERN =
  /^(https:\/\/image\.tmdb\.org\/t\/p)\/(?:w\d+|h\d+|original)(\/.*)$/i;

const DEFAULT_BACKGROUND = Object.freeze({
  overlayOpacity: 0,
  overlayColor: 'var(--black)',
  position: 'center',
  videoOptions: {
    playbackRate: 1,
    autoplay: true,
    muted: true,
    loop: false,
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

  const toggleLoop = useCallback(() => {
    setBackgroundState((prevState) => {
      const nextLoop = !prevState.videoOptions?.loop;
      if (prevState.videoElement) {
        prevState.videoElement.loop = nextLoop;
      }
      return {
        ...prevState,
        videoOptions: {
          ...prevState.videoOptions,
          loop: nextLoop,
        },
      };
    });
  }, []);

  const resetBackground = useCallback(() => {
    setBackgroundState(DEFAULT_BACKGROUND);
  }, []);

  const setBackgroundFromRegistry = useCallback((registryConfig) => {
    setBackgroundState((prevState) => {
      const isSameVideo = Boolean(prevState.video && prevState.video === registryConfig?.video);
      const isSameImage = Boolean(prevState.image && prevState.image === registryConfig?.image);
      const isSameSource = isSameVideo || isSameImage;

      if (isSameSource) {
        return mergeBackgroundState(prevState, registryConfig);
      }

      return mergeBackgroundState(DEFAULT_BACKGROUND, registryConfig);
    });
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
      leftGradient: background.leftGradient,
      rightGradient: background.rightGradient,
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
      toggleLoop,
    }),
    [setVideoPlaying, setVideoElement, resetBackground, setBackground, toggleVideo, toggleMute, toggleLoop],
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

function getMotionConfig(pageAnimation) {
  const resolvedAnimation = pageAnimation || {};

  return {
    exitDurationFactor: Number(resolvedAnimation?.exitDurationFactor),
    transition: resolvedAnimation?.transition ?? {
      duration: 0.6,
      ease: [0.4, 0, 0.2, 1],
    },
    initial: resolvedAnimation?.initial ?? { opacity: 0 },
    animate: resolvedAnimation?.animate ?? { opacity: 1 },
    exit: resolvedAnimation?.exit ?? { opacity: 0 },
  };
}

function toCssDuration(seconds) {
  const value = Number(seconds);
  return `${Math.max(0, Number.isFinite(value) ? value : 0.6) * 1000}ms`;
}

function toCssDelay(seconds) {
  const value = Number(seconds);
  return `${Math.max(0, Number.isFinite(value) ? value : 0) * 1000}ms`;
}

function toCssEasing(easing) {
  if (Array.isArray(easing)) {
    return `cubic-bezier(${easing.join(', ')})`;
  }

  if (typeof easing === 'string' && easing.trim()) {
    return easing;
  }

  return 'ease';
}

function getVisualStyle(currentStyle = {}) {
  const { leftGradient = 0, rightGradient = 0, ...baseStyle } = currentStyle;

  return {
    rightGradient,
    leftGradient,
    baseStyle,
  };
}

function applyVideoPlaybackState({
  setVideoPlaying,
  playbackRate,
  videoElement,
  isPlaying,
  isMuted,
}) {
  if (!videoElement) {
    return;
  }

  videoElement.playbackRate = playbackRate;
  videoElement.muted = isMuted;

  if (!isPlaying) {
    if (!videoElement.paused) {
      videoElement.pause();
    }
    return;
  }

  if (videoElement.ended) {
    videoElement.currentTime = 0;
  }

  if (videoElement.paused) {
    videoElement.play().catch((error) => {
      console.warn('Play failed', error);
      setVideoPlaying(false);
    });
  }
}

function BackgroundGradients({ count, direction }) {
  return Array.from({ length: count }).map((_, index) => (
    <div
      key={`${direction}-${index}`}
      className={
        direction === 'left'
          ? 'pointer-events-none fixed inset-0 bg-linear-to-r from-black via-transparent to-transparent'
          : 'pointer-events-none fixed inset-0 bg-linear-to-l from-black via-transparent to-transparent'
      }
    />
  ));
}

export function BackgroundOverlay() {
  const {
    hasBackground,
    leftGradient: configuredLeftGradient,
    overlayOpacity,
    overlayColor,
    rightGradient: configuredRightGradient,
    videoStyle,
    imageStyle,
    videoOptions,
    animation,
    isPlaying,
    noiseStyle,
    position,
    isVideo,
    overlay,
    image,
    video,
  } = useBackgroundState();

  const { setVideoPlaying, setVideoElement } = useBackgroundActions();

  const videoRef = useRef(null);

  const isMuted = videoOptions?.muted ?? true;
  const shouldAutoPlay = videoOptions?.autoplay ?? true;
  const isLoop = videoOptions?.loop ?? false;
  const playbackRate = videoOptions?.playbackRate ?? 1;
  const corp = videoOptions?.corp ?? 0;

  const backgroundKey = isVideo ? video : image;
  const motionConfig = useMemo(() => getMotionConfig(animation), [animation]);

  const currentStyle = isVideo ? videoStyle : imageStyle;
  const {
    baseStyle,
    leftGradient: styleLeftGradient,
    rightGradient: styleRightGradient,
  } = useMemo(
    () => getVisualStyle(currentStyle),
    [currentStyle],
  );
  const leftGradient = configuredLeftGradient ?? styleLeftGradient;
  const rightGradient = configuredRightGradient ?? styleRightGradient;
  const {
    opacity: noiseOpacity,
    mixBlendMode: noiseBlendMode,
    ...noiseInlineStyle
  } = noiseStyle || {};
  const overlayTransitionStyle = useMemo(
    () => ({
      transitionDuration: toCssDuration(motionConfig.transition?.duration),
      transitionTimingFunction: toCssEasing(motionConfig.transition?.ease),
      transitionDelay: toCssDelay(motionConfig.transition?.delay),
      transitionProperty: 'opacity',
    }),
    [motionConfig.transition],
  );
  const exitDurationFactor = Number.isFinite(motionConfig.exitDurationFactor)
    ? Math.max(0, motionConfig.exitDurationFactor)
    : 0.6;
  const resolvedExitDuration =
    motionConfig.exit?.transition?.duration ??
    (motionConfig.transition?.duration ?? 0.6) * exitDurationFactor;

  useEffect(() => {
    if (!isVideo || !videoRef.current) {
      return;
    }

    const videoElement = videoRef.current;
    setVideoElement(videoElement);

    applyVideoPlaybackState({
      videoElement,
      isPlaying,
      isMuted,
      playbackRate,
      setVideoPlaying,
    });
  }, [isVideo, video, isPlaying, isMuted, playbackRate, setVideoElement, setVideoPlaying]);

  useEffect(() => {
    return () => {
      setVideoElement(null);
    };
  }, [setVideoElement]);

  function handleEnded() {
    const videoElement = videoRef.current;

    if (!videoElement) {
      return;
    }

    const shouldLoop = Boolean(videoElement.loop);

    if (shouldLoop) {
      videoElement.currentTime = 0;
      videoElement.play().catch((error) => {
        console.warn('Loop play failed', error);
      });
      return;
    }

    videoElement.pause();
    setVideoPlaying(false);
  }

  function handleTimeUpdate() {
    const videoElement = videoRef.current;

    if (
      videoElement &&
      videoElement.duration &&
      corp > 0 &&
      videoElement.currentTime >= videoElement.duration - corp
    ) {
      handleEnded();
    }
  }

  return (
    <AnimatePresence mode="sync">
      {hasBackground && (
        <motion.div
          key={backgroundKey}
          initial={motionConfig.initial}
          animate={motionConfig.animate}
          transition={motionConfig.transition}
          exit={{
            ...motionConfig.exit,
            transition: {
              ...motionConfig.transition,
              delay: 0,
              duration: resolvedExitDuration,
              ease: motionConfig.exit?.transition?.ease ?? [0, 0, 0.2, 1],
            },
          }}
          className="pointer-events-none fixed inset-0 transform-gpu"
          style={{
            zIndex: Z_INDEX.BACKGROUND,
            willChange: 'transform, opacity, filter',
          }}
        >
          {isVideo ? (
            <video
              ref={videoRef}
              src={video}
              className="absolute inset-0 mx-auto h-full w-full object-cover"
              preload="auto"
              muted={isMuted}
              loop={isLoop}
              playsInline
              style={{
                objectFit: 'cover',
                ...baseStyle,
                filter: baseStyle?.filter || undefined,
              }}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              onLoadedData={() => {
                const videoElement = videoRef.current;

                if (!videoElement) {
                  return;
                }

                videoElement.playbackRate = playbackRate;

                if (isMuted && shouldAutoPlay) {
                  videoElement.muted = true;
                  videoElement
                    .play()
                    .then(() => setVideoPlaying(true))
                    .catch((error) => {
                      console.warn('Autoplay prevented on load', error);
                    });
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
            className="pointer-events-none fixed inset-0 h-screen w-screen transform-gpu"
            style={{
              opacity: typeof noiseOpacity === 'number' ? noiseOpacity : 0.04,
              mixBlendMode:
                typeof noiseBlendMode === 'string' && noiseBlendMode.trim()
                  ? noiseBlendMode
                  : 'overlay',
              backgroundImage: 'url(/images/noise.png)',
              backgroundRepeat: 'repeat',
              ...noiseInlineStyle,
            }}
          />

          {overlay && (
            <div
              className="absolute inset-0 transition-all duration-300 ease-in-out"
              style={{
                opacity: overlayOpacity,
                backgroundColor: overlayColor,
                ...overlayTransitionStyle,
              }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
