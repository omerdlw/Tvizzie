'use client';

import { useEffect, useMemo, useRef } from 'react';

import { Z_INDEX } from '@/core/constants';
import { useBackgroundActions, useBackgroundState } from './context';

export { BackgroundProvider, useBackgroundState } from './context';

const NOISE_OPACITY_VALUES = Object.freeze({
  hidden: '0%',
  subtle: '10%',
  visible: '15%',
  elevated: '20%',
});

function resolveNoiseOpacity(opacity) {
  if (opacity === 0 || opacity === '0' || opacity === '0%') {
    return NOISE_OPACITY_VALUES.hidden;
  }

  const numericOpacity =
    typeof opacity === 'string' && opacity.endsWith('%') ? Number(opacity.slice(0, -1)) : Number(opacity);

  if (!Number.isFinite(numericOpacity)) {
    return undefined;
  }

  const opacityPercent = Math.round(numericOpacity <= 1 ? numericOpacity * 100 : numericOpacity);

  if (opacityPercent <= 0) {
    return NOISE_OPACITY_VALUES.hidden;
  }

  if (opacityPercent <= 10) {
    return NOISE_OPACITY_VALUES.subtle;
  }

  if (opacityPercent <= 15) {
    return NOISE_OPACITY_VALUES.visible;
  }

  return NOISE_OPACITY_VALUES.elevated;
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
          ? 'pointer-events-none absolute inset-0 bg-linear-to-r from-black via-transparent to-transparent'
          : 'pointer-events-none absolute inset-0 bg-linear-to-l from-black via-transparent to-transparent'
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

  const currentStyle = isVideo ? videoStyle : imageStyle;
  const { baseStyle, leftGradient, rightGradient } = useMemo(() => getVisualStyle(currentStyle), [currentStyle]);
  const { opacity: noiseOpacity } = noiseStyle || {};
  const resolvedNoiseOpacity = resolveNoiseOpacity(noiseOpacity);

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

  if (!hasBackground) {
    return null;
  }

  return (
    <div key={backgroundKey} className="pointer-events-none fixed inset-0" style={{ zIndex: Z_INDEX.BACKGROUND }}>
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
      {overlay && (
        <div
          className="absolute inset-0"
          style={{
            opacity: overlayOpacity,
            backgroundColor: overlayColor || 'var(--white)',
          }}
        />
      )}
      <div
        className="app-noise-surface background-noise-surface"
        style={{
          opacity: resolvedNoiseOpacity,
        }}
      />
    </div>
  );
}
