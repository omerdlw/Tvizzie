'use client'

import { useState } from 'react'

import Image from 'next/image'
import Link from 'next/link'

import Icon from '@/ui/icon'

const TMDB_IMG = 'https://image.tmdb.org/t/p'

export default function RecommendationCard({ movie }) {
  const [hasError, setHasError] = useState(false)
  const hasImage = movie.poster_path && !hasError
  const title =
    movie.title || movie.original_title || movie.name || movie.original_name
  const year = (movie.release_date || movie.first_air_date)?.slice(0, 4)
  const rating = movie.vote_average > 0 ? movie.vote_average.toFixed(1) : null

  return (
    <Link
      className="group flex w-[calc((100%-12px)/2)] shrink-0 flex-col gap-2 backdrop-blur-sm sm:w-[calc((100%-24px)/3)] md:w-[calc((100%-48px)/4)]"
      onDragStart={(e) => e.preventDefault()}
      href={`/movie/${movie.id}`}
    >
      <div className="relative aspect-2/3 w-full overflow-hidden rounded-[20px] bg-white/5 p-1 ring ring-white/10 transition-all duration-300 group-hover:bg-white/10 group-hover:ring-white/15">
        <div className="relative h-full w-full overflow-hidden rounded-[16px]">
          {hasImage ? (
            <Image
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
              src={`${TMDB_IMG}/w342${movie.poster_path}`}
              onError={() => setHasError(true)}
              draggable="false"
              alt={title}
              fill
            />
          ) : (
            <div className="center h-full w-full">
              <Icon
                className="text-white/50"
                icon="solar:gallery-bold"
                size={20}
              />
            </div>
          )}
          <div className="absolute right-0 -bottom-px left-0 bg-linear-to-t from-black/95 via-black/40 to-transparent p-3 pt-8">
            <p className="truncate text-xs font-bold">{title}</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              {rating && (
                <>
                  <Icon
                    className="text-yellow-500"
                    icon="solar:star-bold"
                    size={10}
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
