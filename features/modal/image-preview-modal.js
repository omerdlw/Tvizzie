'use client'

import { useMemo, useState } from 'react'

import Image from 'next/image'

import { TMDB_IMG } from '@/lib/constants'
import { Spinner } from '@/ui/spinner/index'

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
    <div className={`relative max-h-[85vh] overflow-auto rounded-[16px] bg-white/10 ${frameWidthClass}`}>
      <div
        className="relative h-auto w-full"
        style={{ aspectRatio: String(aspectRatio) }}
      >
        <Image
          src={`${TMDB_IMG}/original${filePath}`}
          className={`object-contain transition duration-[var(--motion-duration-fast)] ${
            isLoaded ? 'visible' : 'invisible'
          }`}
          onLoad={() => setIsLoaded(true)}
          sizes="92vw"
          quality={90}
          alt={data?.name || 'Preview image'}
          fill
        />
        {!isLoaded && <div className="absolute inset-0 center animate-pulse /40">
          <Spinner size={40} />
        </div>}
      </div>
    </div>
  )
}
