'use client'

import { TMDB_IMG } from '@/lib/constants'

import MediaCard from '@/components/shared/media-card'
import Icon from '@/ui/icon'


export default function RecommendationCard({ movie }) {
  const title =
    movie.title || movie.original_title || movie.name || movie.original_name
  const year = (movie.release_date || movie.first_air_date)?.slice(0, 4)
  const rating = movie.vote_average > 0 ? movie.vote_average.toFixed(1) : null

  return (
    <MediaCard
      href={`/movie/${movie.id}`}
      className="w-[calc((100%-12px)/2)] sm:w-[calc((100%-24px)/3)] md:w-[calc((100%-48px)/4)]"
      imageSrc={
        movie.poster_path ? `${TMDB_IMG}/w342${movie.poster_path}` : null
      }
      imageAlt={title}
      title={title}
      meta={
        <>
          {rating && (
            <>
              <Icon className="text-warning" icon="solar:star-bold" size={10} />
              <span className="text-[11px] font-semibold text-white/50">
                {rating}
              </span>
            </>
          )}
          {rating && year && <span className="text-[11px] text-white/50">·</span>}
          {year && <span className="text-[11px] text-white/50">{year}</span>}
        </>
      }
    />
  )
}
