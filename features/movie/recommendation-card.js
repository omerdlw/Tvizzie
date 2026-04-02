'use client'

import MediaCard from '@/features/shared/media-card'
import { TMDB_IMG } from '@/lib/constants'

export default function RecommendationCard({
  movie,
  imagePriority = false,
  imageFetchPriority,
}) {
  const resolvedTitle = movie.title || movie.original_title || 'Untitled'
  const year = movie.release_date?.slice(0, 4)
  const tooltipText = year
    ? `${resolvedTitle} (${year})`
    : resolvedTitle

  return (
    <MediaCard
      href={`/movie/${movie.id}`}
      className="w-full"
      imageSrc={
        movie.poster_path ? `${TMDB_IMG}/w342${movie.poster_path}` : null
      }
      imageAlt={resolvedTitle}
      imagePriority={imagePriority}
      imageFetchPriority={imageFetchPriority}
      tooltipText={tooltipText}
    />
  )
}
