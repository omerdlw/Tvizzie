'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useBackgroundState } from '@/core/modules/background/context';

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function stopPropagation(event) {
  event.stopPropagation();
}

function getVirtualDuration(duration, corp) {
  return Math.max(0, duration - corp);
}

function getProgressRatio(currentTime, virtualDuration) {
  if (virtualDuration <= 0) {
    return 0;
  }

  return clamp(currentTime / virtualDuration, 0, 1);
}

export default function MediaAction() {
  const { isVideo, videoElement, videoOptions } = useBackgroundState();

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const corp = videoOptions?.corp ?? 0;

  const virtualDuration = useMemo(() => {
    return getVirtualDuration(duration, corp);
  }, [duration, corp]);

  const progressRatio = useMemo(() => {
    return getProgressRatio(currentTime, virtualDuration);
  }, [currentTime, virtualDuration]);

  useEffect(() => {
    if (!videoElement) {
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    function syncCurrentTime() {
      setCurrentTime(videoElement.currentTime || 0);
    }

    function syncDuration() {
      setDuration(videoElement.duration || 0);
    }

    syncCurrentTime();
    syncDuration();

    videoElement.addEventListener('timeupdate', syncCurrentTime);
    videoElement.addEventListener('loadedmetadata', syncDuration);
    videoElement.addEventListener('durationchange', syncDuration);

    return () => {
      videoElement.removeEventListener('timeupdate', syncCurrentTime);
      videoElement.removeEventListener('loadedmetadata', syncDuration);
      videoElement.removeEventListener('durationchange', syncDuration);
    };
  }, [videoElement]);

  const handleSeek = useCallback(
    (event) => {
      stopPropagation(event);

      if (!videoElement || virtualDuration <= 0) {
        return;
      }

      const nextTime = clamp(Number.parseFloat(event.target.value) || 0, 0, virtualDuration);

      videoElement.currentTime = nextTime;
      setCurrentTime(nextTime);
    },
    [videoElement, virtualDuration]
  );

  if (!isVideo) {
    return null;
  }

  return (
    <div className="group relative mt-2.5 flex h-7 w-full cursor-pointer items-center overflow-hidden transition-colors duration-[200ms]">
      <input
        value={clamp(currentTime, 0, virtualDuration || 1)}
        onPointerDown={stopPropagation}
        max={virtualDuration || 1}
        onClick={stopPropagation}
        className="absolute inset-0 z-10 w-full cursor-pointer appearance-none bg-transparent text-transparent [&::-moz-range-thumb]:h-0 [&::-moz-range-thumb]:w-0 [&::-moz-range-thumb]:appearance-none [&::-webkit-slider-thumb]:h-0 [&::-webkit-slider-thumb]:w-0 [&::-webkit-slider-thumb]:appearance-none"
        onChange={handleSeek}
        type="range"
        step="0.1"
        min="0"
      />

      <div
        className="absolute top-0 bottom-0 left-0 transition-all duration-[75ms]"
        style={{ width: `${progressRatio * 100}%` }}
      />
    </div>
  );
}
