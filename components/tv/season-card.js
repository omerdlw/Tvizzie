'use client'

import { useState } from 'react'

import Image from 'next/image'

import Icon from '@/ui/icon'

const TMDB_IMG = 'https://image.tmdb.org/t/p'

export default function SeasonCard({ season, onClick }) {
  const [hasError, setHasError] = useState(false)
  const hasImage = season.poster_path && !hasError
  const year = season.air_date?.slice(0, 4)
  const hasRating = season.vote_average > 0

  return (
    <div
      className="group flex w-[calc((100%-12px)/2)] shrink-0 cursor-pointer flex-col sm:w-[calc((100%-24px)/3)]"
      onDragStart={(e) => e.preventDefault()}
      onClick={() => onClick?.(season)}
    >
      <div className="relative aspect-2/3 w-full overflow-hidden rounded-[20px] bg-white/5 p-1 ring ring-white/10 backdrop-blur-sm transition-all duration-300 group-hover:bg-white/10 group-hover:ring-white/15">
        <div className="relative h-full w-full overflow-hidden rounded-[16px]">
          {hasImage ? (
            <Image
              src={`${TMDB_IMG}/w342${season.poster_path}`}
              alt={season.name}
              fill
              draggable="false"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
              onError={() => setHasError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Icon icon="solar:tv-bold" size={20} className="text-white/50" />
            </div>
          )}
          <div className="absolute right-0 -bottom-px left-0 bg-linear-to-t from-black/95 via-black/40 to-transparent p-3 pt-8">
            <p className="truncate text-xs font-bold">{season.name}</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              {hasRating && (
                <>
                  <Icon
                    icon="solar:star-bold"
                    size={10}
                    className="text-yellow-500"
                  />
                  <span className="text-[11px] font-semibold text-white/50">
                    {season.vote_average.toFixed(1)}
                  </span>
                  {(year || season.episode_count > 0) && (
                    <span className="text-[11px] text-white/50">·</span>
                  )}
                </>
              )}
              {year && (
                <span className="text-[11px] text-white/50">{year}</span>
              )}
              {year && season.episode_count > 0 && (
                <span className="text-[11px] text-white/50">·</span>
              )}
              {season.episode_count > 0 && (
                <span className="text-[11px] text-white/50">
                  {season.episode_count} eps
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
