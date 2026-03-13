'use client'

import { TMDB_IMG } from '@/lib/constants'

import MediaCard from '@/components/shared/media-card'
import Icon from '@/ui/icon'


export default function SeasonCard({ season, onClick }) {
  const year = season.air_date?.slice(0, 4)
  const hasRating = season.vote_average > 0

  return (
    <MediaCard
      onClick={() => onClick?.(season)}
      className="w-[calc((100%-12px)/2)] cursor-pointer sm:w-[calc((100%-24px)/3)]"
      imageSrc={
        season.poster_path ? `${TMDB_IMG}/w342${season.poster_path}` : null
      }
      imageAlt={season.name}
      fallbackIcon="solar:tv-bold"
      title={season.name}
      meta={
        <>
          {hasRating && (
            <>
              <Icon icon="solar:star-bold" size={10} className="text-warning" />
              <span className="text-[11px] font-semibold text-white/50">
                {season.vote_average.toFixed(1)}
              </span>
              {(year || season.episode_count > 0) && (
                <span className="text-[11px] text-white/50">·</span>
              )}
            </>
          )}
          {year && <span className="text-[11px] text-white/50">{year}</span>}
          {year && season.episode_count > 0 && (
            <span className="text-[11px] text-white/50">·</span>
          )}
          {season.episode_count > 0 && (
            <span className="text-[11px] text-white/50">
              {season.episode_count} eps
            </span>
          )}
        </>
      }
    />
  )
}
