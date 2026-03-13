'use client'

import { useMemo, useState } from 'react'

import Image from 'next/image'

import { TMDB_IMG } from '@/lib/constants'

function getAspectRatio(data) {
  const aspectRatio = Number(data?.aspect_ratio)
  if (Number.isFinite(aspectRatio) && aspectRatio > 0) {
    return aspectRatio
  }

  const width = Number(data?.width)
  const height = Number(data?.height)
  if (
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 0 &&
    height > 0
  ) {
    return width / height
  }

  return 16 / 9
}

export default function ImagePreviewModal({ data }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const filePath = data?.file_path

  const aspectRatio = useMemo(() => {
    const rawRatio = getAspectRatio(data)
    return Math.min(Math.max(rawRatio, 0.35), 3)
  }, [data])

  if (!filePath) return null

  const isPortrait = aspectRatio < 1
  const frameWidthClass = isPortrait
    ? 'w-[min(92vw,560px)]'
    : 'w-[min(92vw,1200px)]'

  return (
    <div
      className={`relative ${frameWidthClass} max-h-[85vh] overflow-hidden rounded-[24px] bg-white/5`}
    >
      <div
        className="relative h-auto w-full"
        style={{ aspectRatio: String(aspectRatio) }}
      >
        <Image
          src={`${TMDB_IMG}/original${filePath}`}
          className={`object-contain transition-opacity duration-[var(--motion-duration-fast)] ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setIsLoaded(true)}
          sizes="92vw"
          alt={data?.name || 'Preview image'}
          fill
        />
        {!isLoaded && (
          <div className="absolute inset-0 animate-pulse bg-white/5" />
        )}
      </div>
    </div>
  )
}
