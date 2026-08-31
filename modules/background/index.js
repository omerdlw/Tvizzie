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
import { useBackgroundValue } from '@/modules/registry';
import { cn } from '@/ui/class-names';
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
    width: null,
    className: '',
  },
  videoElement: null,
  videoStyle: {},
  videoClassName: '',
  className: '',
  width: null,
  fit: null,
  fadeEdges: null,
  imageStyle: {},
  noiseStyle: {},
  overlay: false,
  image: null,
  video: null,
  isPlaying: false,
  animation: null,
});

const BG_TO_OBJECT_CLASS_MAP = Object.freeze({
  'bg-contain': 'object-contain',
  'bg-cover': 'object-cover',
  'bg-fill': 'object-fill',
  'bg-none': 'object-none',
  'bg-scale-down': 'object-scale-down',
  'bg-center': 'object-center',
  'bg-top': 'object-top',
  'bg-bottom': 'object-bottom',
  'bg-left': 'object-left',
  'bg-right': 'object-right',
  'bg-left-top': 'object-left-top',
  'bg-left-bottom': 'object-left-bottom',
  'bg-right-top': 'object-right-top',
  'bg-right-bottom': 'object-right-bottom',
});

const FIT_TO_OBJECT_CLASS_MAP = Object.freeze({
  contain: 'object-contain',
  cover: 'object-cover',
  fill: 'object-fill',
  none: 'object-none',
  'scale-down': 'object-scale-down',
});

function resolveVideoClasses(...inputs) {
  const customClasses = inputs
    .filter(Boolean)
    .flatMap((entry) =>
      typeof entry === 'string' ? entry.replace(/,/g, ' ').trim().split(/\s+/) : [],
    )
    .filter(Boolean);

  const mapped = [];
  for (const cls of customClasses) {
    if (BG_TO_OBJECT_CLASS_MAP[cls]) {
      mapped.push(BG_TO_OBJECT_CLASS_MAP[cls]);
    }
  }

  return {
    customClasses: customClasses.join(' '),
    mappedClasses: mapped.join(' '),
  };
}

function extractWidthClasses(className = '') {
  if (!className || typeof className !== 'string') return { widthClasses: '', nonWidthClasses: '' };
  const tokens = className.replace(/,/g, ' ').trim().split(/\s+/).filter(Boolean);
  const widthTokens = [];
  const otherTokens = [];
  for (const token of tokens) {
    if (/^(w-|max-w-|min-w-)/.test(token)) {
      widthTokens.push(token);
    } else {
      otherTokens.push(token);
    }
  }
  return {
    widthClasses: widthTokens.join(' '),
    nonWidthClasses: otherTokens.join(' '),
  };
}

function resolveGradientSettings({
  leftGradient = 0,
  rightGradient = 0,
  fadeEdges = null,
  hasWidth = false,
}) {
  let leftPercent = 0;
  let rightPercent = 0;

  if (leftGradient > 0) {
    leftPercent = Math.min(48, Math.max(12, leftGradient * 7.5));
  } else if (hasWidth && fadeEdges !== false) {
    leftPercent = 20;
  }

  if (rightGradient > 0) {
    rightPercent = Math.min(48, Math.max(12, rightGradient * 7.5));
  } else if (hasWidth && fadeEdges !== false) {
    rightPercent = 20;
  }

  if (typeof fadeEdges === 'number') {
    leftPercent = fadeEdges;
    rightPercent = fadeEdges;
  } else if (typeof fadeEdges === 'string') {
    const parsed = parseFloat(fadeEdges);
    if (!Number.isNaN(parsed)) {
      leftPercent = parsed;
      rightPercent = parsed;
    }
  } else if (typeof fadeEdges === 'object' && fadeEdges !== null) {
    if (fadeEdges.left !== undefined) leftPercent = parseFloat(fadeEdges.left) || 0;
    if (fadeEdges.right !== undefined) rightPercent = parseFloat(fadeEdges.right) || 0;
  } else if (fadeEdges === false) {
    leftPercent = 0;
    rightPercent = 0;
  }

  const leftOpacity = leftGradient > 0 ? Math.min(1, leftGradient * 0.22) : 0;
  const rightOpacity = rightGradient > 0 ? Math.min(1, rightGradient * 0.22) : 0;

  return {
    leftPercent,
    rightPercent,
    leftOpacity,
    rightOpacity,
    enabled: leftPercent > 0 || rightPercent > 0,
  };
}

function generateSmoothstepStops(percent, direction = 'in') {
  const steps = [
    { t: 0, s: 0 },
    { t: 0.15, s: 0.06 },
    { t: 0.35, s: 0.22 },
    { t: 0.55, s: 0.47 },
    { t: 0.75, s: 0.76 },
    { t: 0.9, s: 0.93 },
    { t: 1.0, s: 1.0 },
  ];

  if (direction === 'in') {
    return steps.map(({ t, s }) => `rgba(0,0,0,${s}) ${(t * percent).toFixed(1)}%`);
  }

  return steps.map(
    ({ t, s }) => `rgba(0,0,0,${(1 - s).toFixed(2)}) ${(100 - percent + t * percent).toFixed(1)}%`,
  );
}

function getEdgeFadeMask({ leftPercent = 0, rightPercent = 0 }) {
  if (leftPercent <= 0 && rightPercent <= 0) {
    return undefined;
  }

  const leftStops =
    leftPercent > 0 ? generateSmoothstepStops(leftPercent, 'in') : ['rgba(0,0,0,1) 0%'];

  const rightStops =
    rightPercent > 0 ? generateSmoothstepStops(rightPercent, 'out') : ['rgba(0,0,0,1) 100%'];

  return `linear-gradient(to right, ${leftStops.join(', ')}, ${rightStops.join(', ')})`;
}

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

  const registryBackground = useBackgroundValue();

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
      videoClassName: background.videoClassName,
      className: background.className,
      width: background.width,
      fit: background.fit,
      fadeEdges: background.fadeEdges,
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
    [
      setVideoPlaying,
      setVideoElement,
      resetBackground,
      setBackground,
      toggleVideo,
      toggleMute,
      toggleLoop,
    ],
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
  if (!count || count <= 0) return null;

  const opacity = Math.min(1, Math.max(0.2, count * 0.25));

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-y-0 z-0',
        direction === 'left' ? 'left-0' : 'right-0',
      )}
      style={{
        width: '50vw',
        opacity,
        background:
          direction === 'left'
            ? 'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 15%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0.18) 75%, rgba(0,0,0,0) 100%)'
            : 'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 15%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0.18) 75%, rgba(0,0,0,0) 100%)',
      }}
    />
  );
}

export function BackgroundOverlay() {
  const {
    hasBackground,
    leftGradient: configuredLeftGradient,
    overlayOpacity,
    overlayColor,
    rightGradient: configuredRightGradient,
    videoStyle,
    videoClassName,
    className,
    width,
    fit,
    fadeEdges,
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
  } = useMemo(() => getVisualStyle(currentStyle), [currentStyle]);
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

  const rawWidth = width ?? videoOptions?.width ?? videoStyle?.width;
  const resolvedWidth =
    rawWidth !== undefined && rawWidth !== null && rawWidth !== ''
      ? typeof rawWidth === 'number'
        ? `${rawWidth}px`
        : rawWidth
      : undefined;

  const rawFit = fit ?? videoOptions?.fit ?? videoOptions?.objectFit;
  const fitClass = rawFit ? FIT_TO_OBJECT_CLASS_MAP[rawFit] || '' : '';

  const { customClasses, mappedClasses } = useMemo(
    () =>
      resolveVideoClasses(
        videoClassName,
        className,
        videoOptions?.videoClassName,
        videoOptions?.className,
        videoStyle?.className,
      ),
    [
      videoClassName,
      className,
      videoOptions?.videoClassName,
      videoOptions?.className,
      videoStyle?.className,
    ],
  );

  const { widthClasses, nonWidthClasses } = useMemo(
    () => extractWidthClasses(customClasses),
    [customClasses],
  );

  const hasCustomWidth = Boolean(resolvedWidth || (widthClasses && widthClasses.trim().length > 0));

  const gradientSettings = useMemo(
    () =>
      resolveGradientSettings({
        fadeEdges,
        leftGradient,
        rightGradient,
        hasWidth: hasCustomWidth,
      }),
    [fadeEdges, leftGradient, rightGradient, hasCustomWidth],
  );

  const resolvedMaskImage = useMemo(
    () =>
      gradientSettings.enabled
        ? getEdgeFadeMask({
            leftPercent: gradientSettings.leftPercent,
            rightPercent: gradientSettings.rightPercent,
          })
        : undefined,
    [gradientSettings],
  );

  const wrapperPositionClass =
    position === 'left'
      ? 'left-0 ml-0 mr-auto'
      : position === 'right'
        ? 'right-0 mr-0 ml-auto'
        : 'inset-x-0 mx-auto';

  const videoClasses = cn('h-full w-full object-cover', fitClass, mappedClasses, nonWidthClasses);

  const resolvedObjectPosition =
    baseStyle?.objectPosition || (typeof position === 'string' && position ? position : undefined);

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
            <div
              className={cn(
                'pointer-events-none absolute inset-y-0 overflow-hidden',
                wrapperPositionClass,
                widthClasses || (resolvedWidth ? '' : 'w-full'),
              )}
              style={{
                ...(resolvedWidth ? { width: resolvedWidth } : {}),
                maxWidth: '100%',
              }}
            >
              <video
                ref={videoRef}
                src={video}
                className={videoClasses}
                preload="auto"
                muted={isMuted}
                loop={isLoop}
                playsInline
                style={{
                  ...(resolvedObjectPosition ? { objectPosition: resolvedObjectPosition } : {}),
                  ...(resolvedMaskImage
                    ? {
                        maskImage: resolvedMaskImage,
                        WebkitMaskImage: resolvedMaskImage,
                      }
                    : {}),
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

              {gradientSettings.leftOpacity > 0 && (
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 z-10"
                  style={{
                    width: `${Math.max(30, gradientSettings.leftPercent * 1.15)}%`,
                    opacity: gradientSettings.leftOpacity,
                    background:
                      'linear-gradient(to right, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 25%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.1) 80%, rgba(0,0,0,0) 100%)',
                  }}
                />
              )}
              {gradientSettings.rightOpacity > 0 && (
                <div
                  className="pointer-events-none absolute inset-y-0 right-0 z-10"
                  style={{
                    width: `${Math.max(30, gradientSettings.rightPercent * 1.15)}%`,
                    opacity: gradientSettings.rightOpacity,
                    background:
                      'linear-gradient(to left, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 25%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.1) 80%, rgba(0,0,0,0) 100%)',
                  }}
                />
              )}

              {hasCustomWidth && (
                <div
                  className="pointer-events-none absolute inset-0 transform-gpu"
                  style={{
                    opacity: typeof noiseOpacity === 'number' ? noiseOpacity : 0.04,
                    mixBlendMode:
                      typeof noiseBlendMode === 'string' && noiseBlendMode.trim()
                        ? noiseBlendMode
                        : 'overlay',
                    backgroundImage: 'url(/images/noise.png)',
                    backgroundRepeat: 'repeat',
                    ...(resolvedMaskImage
                      ? {
                          maskImage: resolvedMaskImage,
                          WebkitMaskImage: resolvedMaskImage,
                        }
                      : {}),
                    ...noiseInlineStyle,
                  }}
                />
              )}

              {hasCustomWidth && overlay && (
                <div
                  className="pointer-events-none absolute inset-0 transition-all duration-300 ease-in-out"
                  style={{
                    opacity: overlayOpacity,
                    backgroundColor: overlayColor,
                    ...(resolvedMaskImage
                      ? {
                          maskImage: resolvedMaskImage,
                          WebkitMaskImage: resolvedMaskImage,
                        }
                      : {}),
                    ...overlayTransitionStyle,
                  }}
                />
              )}
            </div>
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

          {(!isVideo || !hasCustomWidth) && (
            <>
              <BackgroundGradients count={leftGradient} direction="left" />
              <BackgroundGradients count={rightGradient} direction="right" />
            </>
          )}

          {(!isVideo || !hasCustomWidth) && (
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
          )}

          {(!isVideo || !hasCustomWidth) && overlay && (
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
