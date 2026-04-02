'use client'

import MediaCard from '@/features/shared/media-card'
import { TMDB_IMG } from '@/lib/constants'
import { resolveExplicitMediaType } from '@/lib/media'
import { cn } from '@/lib/utils'

export default function MediaPosterCard({
  item,
  className = '',
  aspectSquare = false,
  imageLoading,
  imagePriority = false,
  imageFetchPriority,
  fallbackMediaType = 'movie',
}) {
  const mediaType = resolveExplicitMediaType(item, fallbackMediaType)

  if (mediaType !== 'movie') {
    return null
  }

  const detailId = item.entityId || item.id
  const title =
    item.title || item.original_title || item.name || item.original_name
  const resolvedTitle = title || 'Untitled'
  const year = item.release_date?.slice(0, 4)
  const href = `/movie/${detailId}`
  const imageSrc = item.poster_path_full
    ? item.poster_path_full
    : item.poster_path
      ? `${TMDB_IMG}/w342${item.poster_path}`
      : null
  const tooltipText = year
    ? `${resolvedTitle} (${year})`
    : resolvedTitle

  return (
    <MediaCard
      href={href}
      className={cn('w-full', className)}
      aspectClass={aspectSquare ? 'aspect-square' : 'aspect-2/3'}
      imageSrc={imageSrc}
      imageAlt={resolvedTitle}
      imageSizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
      imageLoading={imageLoading}
      imagePriority={imagePriority}
      imageFetchPriority={imageFetchPriority}
      fallbackIconClassName="text-white/50"
      tooltipText={tooltipText}
    />
  )
}
