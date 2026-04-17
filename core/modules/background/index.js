'use client';

import { useEffect, useMemo, useRef } from 'react';

import { AnimatePresence, motion } from 'framer-motion';

import { DURATION, EASING, Z_INDEX } from '@/core/constants';
import { NoiseTexture } from '@/ui/elements/noise-texture';

import { useBackgroundActions, useBackgroundState } from './context';

export { BackgroundProvider, useBackgroundState } from './context';

function getMotionConfig(pageAnimation) {
  const resolvedAnimation = pageAnimation || {};

  return {
    exitDurationFactor: Number(resolvedAnimation?.exitDurationFactor),
    transition: resolvedAnimation?.transition ?? {
      duration: DURATION.SLOW,
      ease: EASING.EASE_IN_OUT,
    },
    initial: resolvedAnimation?.initial ?? { opacity: 0 },
    animate: resolvedAnimation?.animate ?? { opacity: 1 },
    exit: resolvedAnimation?.exit ?? { opacity: 0 },
  };
}

function toCssDuration(seconds) {
  const value = Number(seconds);
  return `${Math.max(0, Number.isFinite(value) ? value : DURATION.SLOW) * 1000}ms`;
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

function shouldRestartFromBeginning(videoElement, corp) {
  if (!videoElement) {
    return false;
  }

  if (videoElement.ended) {
    return true;
  }

  return Boolean(videoElement.duration && corp > 0 && videoElement.currentTime >= videoElement.duration - corp);
}

function applyVideoPlaybackState({ setVideoPlaying, playbackRate, videoElement, isPlaying, isMuted, corp }) {
  if (!videoElement) {
    return;
  }

  videoElement.playbackRate = playbackRate;
  videoElement.muted = isMuted;

  if (!isPlaying) {
    videoElement.pause();
    return;
  }

  if (shouldRestartFromBeginning(videoElement, corp)) {
    videoElement.currentTime = 0;
  }

  videoElement.play().catch((error) => {
    console.warn('Play failed', error);
    setVideoPlaying(false);
  });
}

function BackgroundGradients({ count, direction }) {
  return Array.from({ length: count }).map((_, index) => (
    <div
      key={`${direction}-${index}`}
      className={
        direction === 'left'
          ? 'pointer-events-none absolute inset-0 bg-linear-to-r from-[#e2e8f0] via-transparent to-transparent'
          : 'pointer-events-none absolute inset-0 bg-linear-to-l from-[#e2e8f0] via-transparent to-transparent'
      }
    />
  ));
}

export function BackgroundOverlay() {
  const {
    hasBackground,
    overlayOpacity,
    overlayColor,
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
  const isLoop = videoOptions?.loop ?? true;
  const playbackRate = videoOptions?.playbackRate ?? 1;
  const corp = videoOptions?.corp ?? 0;

  const backgroundKey = isVideo ? video : image;
  const motionConfig = useMemo(() => getMotionConfig(animation), [animation]);

  const currentStyle = isVideo ? videoStyle : imageStyle;
  const { baseStyle, leftGradient, rightGradient } = useMemo(() => getVisualStyle(currentStyle), [currentStyle]);
  const { opacity: noiseOpacity, mixBlendMode: noiseBlendMode, ...noiseInlineStyle } = noiseStyle || {};
  const overlayTransitionStyle = useMemo(
    () => ({
      transitionDuration: toCssDuration(motionConfig.transition?.duration),
      transitionTimingFunction: toCssEasing(motionConfig.transition?.ease),
      transitionDelay: toCssDelay(motionConfig.transition?.delay),
      transitionProperty: 'opacity',
    }),
    [motionConfig.transition]
  );
  const exitDurationFactor = Number.isFinite(motionConfig.exitDurationFactor)
    ? Math.max(0, motionConfig.exitDurationFactor)
    : DURATION.RATIO.EXIT;
  const resolvedExitDuration = Math.min(
    DURATION.QUICK,
    (motionConfig.transition?.duration ?? DURATION.MODERATE) * exitDurationFactor
  );

  useEffect(() => {
    if (!isVideo || !videoRef.current) {
      return;
    }

    const videoElement = videoRef.current;

    applyVideoPlaybackState({
      videoElement,
      isPlaying,
      isMuted,
      playbackRate,
      corp,
      setVideoPlaying,
    });

    setVideoElement(videoElement);

    return () => {
      setVideoElement(null);
    };
  }, [isVideo, video, isPlaying, isMuted, playbackRate, corp, setVideoElement, setVideoPlaying]);

  function handleEnded() {
    const videoElement = videoRef.current;

    if (!videoElement) {
      return;
    }

    if (isLoop) {
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

    if (videoElement && videoElement.duration && corp > 0 && videoElement.currentTime >= videoElement.duration - corp) {
      handleEnded();
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
              delay: 0,
              duration: resolvedExitDuration,
              ease: EASING.EASE_OUT,
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

          <NoiseTexture
            className="fixed inset-0 h-screen w-screen transform-gpu"
            opacity={typeof noiseOpacity === 'number' ? noiseOpacity : 0.04}
            blend={typeof noiseBlendMode === 'string' && noiseBlendMode.trim() ? noiseBlendMode : 'overlay'}
            grain="medium"
            style={noiseInlineStyle}
          />

          {overlay && (
            <div
              className="absolute inset-0 transition-opacity"
              style={{
                opacity: overlayOpacity,
                backgroundColor: overlayColor || '#faf9f5',
                ...overlayTransitionStyle,
              }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
