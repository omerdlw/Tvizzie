'use client'

import { TMDB_IMG } from '@/lib/constants'

import { useState } from 'react'

import Image from 'next/image'

import Icon from '@/ui/icon'


export default function PersonHero({ person }) {
  const [hasError, setHasError] = useState(false)
  const hasImage = person.profile_path && !hasError

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative h-86 w-64 overflow-hidden rounded-[50px] ring-1 ring-white/15">
        {hasImage ? (
          <Image
            src={`${TMDB_IMG}/h632${person.profile_path}`}
            alt={person.name}
            fill
            priority
            className="object-cover"
            sizes="192px"
            onError={() => setHasError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-white/5">
            <Icon icon="solar:user-bold" size={64} className="text-white/15" />
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-zuume text-5xl font-bold tracking-tight uppercase sm:text-6xl md:text-7xl lg:text-8xl">
          {person.name}
        </h1>
        {person.known_for_department && (
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold tracking-widest text-white/70 uppercase backdrop-blur-sm">
            {person.known_for_department}
          </span>
        )}
      </div>
    </div>
  )
}
