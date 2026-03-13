'use client'

import { TMDB_IMG } from '@/lib/constants'

import MediaCard from '@/components/shared/media-card'
import Icon from '@/ui/icon'


export default function TvRecommendationCard({ show }) {
  const title =
    show.name || show.original_name || show.title || show.original_title
  const year = (show.first_air_date || show.release_date)?.slice(0, 4)
  const rating = show.vote_average > 0 ? show.vote_average.toFixed(1) : null

  return (
    <MediaCard
      href={`/tv/${show.id}`}
      className="w-[calc((100%-12px)/2)] sm:w-[calc((100%-24px)/3)] md:w-[calc((100%-48px)/4)]"
      imageSrc={show.poster_path ? `${TMDB_IMG}/w342${show.poster_path}` : null}
      imageAlt={title}
      title={title}
      meta={
        <>
          {rating && (
            <>
              <Icon icon="solar:star-bold" size={10} className="text-warning" />
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
