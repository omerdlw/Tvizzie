'use client'

import { useState } from 'react'

import Image from 'next/image'

import { TMDB_IMG } from '@/lib/constants'
import { canUseNextImageOptimization, cn } from '@/lib/utils'
import Icon from '@/ui/icon'

function resolvePosterSrc(poster) {
  const value = String(poster || '').trim()

  if (!value) {
    return null
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value
  }

  if (value.startsWith('/')) {
    return `${TMDB_IMG}/w185${value}`
  }

  return value
}

export default function MediaThumb({ poster, alt, className = '' }) {
  const [hasError, setHasError] = useState(false)
  const src = hasError ? null : resolvePosterSrc(poster)
  const shouldOptimize = canUseNextImageOptimization(src)

  return (
    <div
      className={cn(
        'relative aspect-2/3 w-20 shrink-0 overflow-hidden border border-white/5 ',
        className
      )}
    >
      {src ? (
        <Image
          fill
          sizes="80px"
          src={src}
          alt={alt || 'Poster'}
          quality={72}
          unoptimized={!shouldOptimize}
          className="object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Icon icon="solar:clapperboard-bold" size={18} className="text-white" />
        </div>
      )}
    </div>
  )
}
