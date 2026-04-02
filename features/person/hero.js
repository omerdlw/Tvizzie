'use client'

import { useState } from 'react'

import Image from 'next/image'

import { TMDB_IMG } from '@/lib/constants'
import { getImagePlaceholderDataUrl } from '@/lib/utils'
import Icon from '@/ui/icon'

function resolveProfileImage(path) {
  if (!path) return null
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${TMDB_IMG}/h632${normalizedPath}`
}

export default function PersonHero({ person, overline = null }) {
  const [hasError, setHasError] = useState(false)
  const imageSrc = resolveProfileImage(person?.profile_path)
  const hasImage = imageSrc && !hasError

  return (
    <div className="flex flex-col items-center gap-6">
      {!overline && (
        <div className="relative h-86 w-64 overflow-hidden  border border-white/5">
          {hasImage ? (
            <Image
              src={imageSrc}
              alt={person.name}
              fill
              priority
              className="object-cover"
              sizes="256px"
              quality={88}
              placeholder="blur"
              blurDataURL={getImagePlaceholderDataUrl(
                `${person?.id || person?.name}-${imageSrc}`
              )}
              onError={() => setHasError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center ">
              <Icon
                icon="solar:user-bold"
                size={64}
                className="text-white"
              />
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col items-center gap-2 text-center">
        {overline && (
          <p className="mt-2 text-sm font-semibold tracking-widest text-white uppercase">
            {overline}
          </p>
        )}
        <h1 className="font-zuume text-5xl font-bold uppercase sm:text-6xl md:text-7xl lg:text-8xl">
          {person.name}
        </h1>
        {person.known_for_department && (
          <span className=" border border-white/5  px-3 py-1 text-[11px] font-semibold tracking-widest text-white uppercase ">
            {person.known_for_department}
          </span>
        )}
      </div>
    </div>
  )
}
