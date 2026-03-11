'use client'

import { useState } from 'react'

import Image from 'next/image'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import Icon from '@/ui/icon'

const TMDB_IMG = 'https://image.tmdb.org/t/p'

export default function ContentCard({ item, className = '', aspectSquare = false }) {
  const [hasError, setHasError] = useState(false)
  const hasImage = (item.poster_path || item.poster_path_full) && !hasError
  const mediaType =
    item.media_type ||
    item.entityType ||
    (item.title && !item.name ? 'movie' : 'tv')
  const isMovie = mediaType === 'movie'
  const detailId = item.entityId || item.id
  const title = isMovie
    ? item.title || item.original_title
    : item.name || item.original_name
  const year = (isMovie ? item.release_date : item.first_air_date)?.slice(0, 4)
  const rating = item.vote_average > 0 ? item.vote_average.toFixed(1) : null
  const href = isMovie ? `/movie/${detailId}` : `/tv/${detailId}`
  const rank = item.rank

  return (
    <Link
      href={href}
      onDragStart={(e) => e.preventDefault()}
      className={cn(
        'group flex shrink-0 flex-col',
        className ||
          'w-[calc((100%-12px)/2)] sm:w-[calc((100%-24px)/3)] md:w-[calc((100%-40px)/4)] lg:w-[calc((100%-60px)/6)]'
      )}
    >
      <div className={cn(
        'relative w-full overflow-hidden rounded-[20px] bg-white/5 p-1 ring-1 ring-white/10 backdrop-blur-sm transition-all duration-300 group-hover:bg-white/10 group-hover:ring-white/15',
        aspectSquare ? 'aspect-square' : 'aspect-2/3'
      )}>
        <div className="relative h-full w-full overflow-hidden rounded-[16px]">
          {rank && (
            <div className="absolute top-2 left-2 z-10 flex h-7 min-w-[28px] items-center justify-center rounded-full bg-black/60 px-1.5 text-xs font-bold text-white ring-1 ring-white/20 backdrop-blur-md">
              #{rank}
            </div>
          )}
          {hasImage ? (
            <Image
              src={
                item.poster_path_full || `${TMDB_IMG}/w342${item.poster_path}`
              }
              alt={title || 'Cover Image'}
              fill
              draggable="false"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
              onError={() => setHasError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Icon
                icon="solar:gallery-bold"
                size={20}
                className="text-white/15"
              />
            </div>
          )}
          <div className="absolute right-0 bottom-0 left-0 bg-linear-to-t from-black/80 via-black/40 to-transparent p-3 pt-8">
            <p className="truncate text-xs font-bold text-white/90">{title}</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              {rating && (
                <>
                  <Icon
                    icon="solar:star-bold"
                    size={10}
                    className="text-yellow-500"
                  />
                  <span className="text-[10px] font-semibold text-white/60">
                    {rating}
                  </span>
                </>
              )}
              {rating && year && (
                <span className="text-[10px] text-white/30">·</span>
              )}
              {year && (
                <span className="text-[10px] text-white/50">{year}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
