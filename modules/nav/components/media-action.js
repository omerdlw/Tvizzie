'use client'

import { useCallback, useEffect, useState } from 'react'

import { useBackgroundState } from '@/modules/background/context'

export default function MediaAction() {
  const { isVideo, videoElement, videoOptions } = useBackgroundState()
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const corp = videoOptions?.corp ?? 0
  const virtualDuration = Math.max(0, duration - corp)

  useEffect(() => {
    if (!videoElement) return
    const handleTimeUpdate = () => setCurrentTime(videoElement.currentTime)
    const handleLoadedMetadata = () => setDuration(videoElement.duration)

    if (videoElement.duration) setDuration(videoElement.duration)
    setCurrentTime(videoElement.currentTime)

    videoElement.addEventListener('timeupdate', handleTimeUpdate)
    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata)

    return () => {
      videoElement.removeEventListener('timeupdate', handleTimeUpdate)
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [videoElement])

  const handleSeek = useCallback(
    (e) => {
      e.stopPropagation()
      const newTime = parseFloat(e.target.value)
      if (videoElement && virtualDuration > 0) {
        videoElement.currentTime = Math.min(newTime, virtualDuration)
        setCurrentTime(newTime)
      }
    },
    [videoElement, virtualDuration]
  )

  if (!isVideo) return null

  const progressRatio =
    virtualDuration > 0 ? Math.min(currentTime / virtualDuration, 1) : 0

  return (
    <div className="group relative mt-2.5 flex h-7 w-full cursor-pointer items-center overflow-hidden rounded-[20px] bg-white/5 transition-colors duration-[var(--motion-duration-fast)] hover:bg-white/10">
      <input
        type="range"
        min="0"
        max={virtualDuration || 1}
        step="0.1"
        value={currentTime}
        onChange={handleSeek}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute inset-0 z-10 w-full cursor-pointer opacity-0"
      />
      <div
        className="absolute top-0 bottom-0 left-0 rounded-full bg-white/10 transition-all duration-[var(--motion-duration-micro)]"
        style={{ width: `${progressRatio * 100}%` }}
      />
    </div>
  )
}
