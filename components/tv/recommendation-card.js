'use client'

import { useState } from 'react'

import Image from 'next/image'
import Link from 'next/link'

import Icon from '@/ui/icon'

const TMDB_IMG = 'https://image.tmdb.org/t/p'

export default function TvRecommendationCard({ show }) {
  const [hasError, setHasError] = useState(false)
  const hasImage = show.poster_path && !hasError

  const title =
    show.name || show.original_name || show.title || show.original_title
  const year = (show.first_air_date || show.release_date)?.slice(0, 4)
  const rating = show.vote_average > 0 ? show.vote_average.toFixed(1) : null

  return (
    <Link
      href={`/tv/detail/${show.id}`}
      onDragStart={(e) => e.preventDefault()}
      className="group flex w-[calc((100%-12px)/2)] shrink-0 flex-col gap-2 backdrop-blur-sm sm:w-[calc((100%-24px)/3)] md:w-[calc((100%-48px)/4)]"
    >
      <div className="relative aspect-2/3 w-full overflow-hidden rounded-[20px] bg-white/5 p-1 ring ring-white/10 transition-all duration-300 group-hover:bg-white/10 group-hover:ring-white/15">
        <div className="relative h-full w-full overflow-hidden rounded-[16px]">
          {hasImage ? (
            <Image
              src={`${TMDB_IMG}/w342${show.poster_path}`}
              alt={title}
              fill
              draggable="false"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
              onError={() => setHasError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Icon
                icon="solar:gallery-bold"
                size={20}
                className="text-white/50"
              />
            </div>
          )}
          <div className="absolute right-0 -bottom-px left-0 bg-linear-to-t from-black/95 via-black/40 to-transparent p-3 pt-8">
            <p className="truncate text-xs font-bold">{title}</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              {rating && (
                <>
                  <Icon
                    icon="solar:star-bold"
                    size={10}
                    className="text-yellow-500"
                  />
                  <span className="text-[11px] font-semibold text-white/50">
                    {rating}
                  </span>
                </>
              )}
              {rating && year && (
                <span className="text-[11px] text-white/50">·</span>
              )}
              {year && (
                <span className="text-[11px] text-white/50">{year}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
