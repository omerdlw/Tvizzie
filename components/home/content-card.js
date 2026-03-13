'use client'

import { TMDB_IMG } from '@/lib/constants'

import MediaCard from '@/components/shared/media-card'
import { cn } from '@/lib/utils'
import Icon from '@/ui/icon'


export default function ContentCard({
  item,
  className = '',
  aspectSquare = false,
}) {
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
  const imageSrc = item.poster_path_full
    ? item.poster_path_full
    : item.poster_path
      ? `${TMDB_IMG}/w342${item.poster_path}`
      : null

  return (
    <MediaCard
      href={href}
      className={cn(
        'shrink-0',
        className ||
          'w-[calc((100%-12px)/2)] sm:w-[calc((100%-24px)/3)] md:w-[calc((100%-40px)/4)] lg:w-[calc((100%-60px)/6)]'
      )}
      aspectClass={aspectSquare ? 'aspect-square' : 'aspect-2/3'}
      imageSrc={imageSrc}
      imageAlt={title || 'Cover Image'}
      imageSizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
      fallbackIconClassName="text-white/15"
      topOverlay={
        rank ? (
          <div className="absolute top-2 left-2 z-10 flex h-7 min-w-[28px] items-center justify-center rounded-full bg-black/60 px-1.5 text-xs font-bold text-white ring-1 ring-white/20 backdrop-blur-sm">
            #{rank}
          </div>
        ) : null
      }
      title={title}
      titleClassName="truncate text-xs font-bold text-white/90"
      footerClassName="bg-linear-to-t from-black/80 via-black/40 to-transparent p-3 pt-8"
      meta={
        <>
          {rating && (
            <>
              <Icon icon="solar:star-bold" size={10} className="text-warning" />
              <span className="text-[10px] font-semibold text-white/60">
                {rating}
              </span>
            </>
          )}
          {rating && year && <span className="text-[10px] text-white/30">·</span>}
          {year && <span className="text-[10px] text-white/50">{year}</span>}
        </>
      }
    />
  )
}
