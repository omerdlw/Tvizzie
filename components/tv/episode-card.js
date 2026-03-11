'use client'

import { useState } from 'react'

import Image from 'next/image'

import Icon from '@/ui/icon'

const TMDB_IMG = 'https://image.tmdb.org/t/p'

export default function EpisodeCard({ episode }) {
  const [hasError, setHasError] = useState(false)
  const hasImage = episode.still_path && !hasError
  const airDate = episode.air_date?.slice(0, 4)
  const hasRating = episode.vote_average > 0

  return (
    <div
      className="group flex w-72 shrink-0 flex-col"
      onDragStart={(e) => e.preventDefault()}
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-[20px] bg-white/5 p-1 ring ring-white/10 backdrop-blur-sm transition-all duration-300 group-hover:bg-white/10 group-hover:ring-white/15">
        <div className="relative h-full w-full overflow-hidden rounded-[16px]">
          {hasImage ? (
            <Image
              src={`${TMDB_IMG}/w780${episode.still_path}`}
              alt={episode.name}
              fill
              draggable="false"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="288px"
              onError={() => setHasError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Icon
                icon="solar:clapperboard-text-bold"
                size={24}
                className="text-white/50"
              />
            </div>
          )}
          <div className="absolute top-2 left-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white/80 ring-1 ring-white/10 backdrop-blur-sm">
            E{episode.episode_number}
          </div>
          <div className="absolute right-0 -bottom-px left-0 bg-linear-to-t from-black/95 via-black/40 to-transparent p-3 pt-6">
            <p className="truncate text-xs font-bold">{episode.name}</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              {hasRating && (
                <>
                  <Icon
                    icon="solar:star-bold"
                    size={10}
                    className="text-yellow-500"
                  />
                  <span className="text-[11px] font-semibold text-white/50">
                    {episode.vote_average.toFixed(1)}
                  </span>
                  {airDate && (
                    <span className="text-[11px] text-white/50">·</span>
                  )}
                </>
              )}
              {airDate && (
                <span className="text-[11px] text-white/50">{airDate}</span>
              )}
              {episode.runtime > 0 && (
                <>
                  <span className="text-[11px] text-white/50">·</span>
                  <span className="text-[11px] text-white/50">
                    {episode.runtime}m
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
