'use client'

import { TMDB_IMG } from '@/lib/constants'

import MediaCard from '@/components/shared/media-card'
import Icon from '@/ui/icon'


export default function EpisodeCard({ episode }) {
  const airDate = episode.air_date?.slice(0, 4)
  const hasRating = episode.vote_average > 0

  return (
    <MediaCard
      className="w-72"
      aspectClass="aspect-video"
      imageSrc={
        episode.still_path ? `${TMDB_IMG}/w780${episode.still_path}` : null
      }
      imageAlt={episode.name}
      imageSizes="288px"
      fallbackIcon="solar:clapperboard-text-bold"
      fallbackIconSize={24}
      topOverlay={
        <div className="absolute top-2 left-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white/80 ring-1 ring-white/10 backdrop-blur-sm">
          E{episode.episode_number}
        </div>
      }
      title={episode.name}
      footerClassName="p-3 pt-6"
      meta={
        <>
          {hasRating && (
            <>
              <Icon icon="solar:star-bold" size={10} className="text-warning" />
              <span className="text-[11px] font-semibold text-white/50">
                {episode.vote_average.toFixed(1)}
              </span>
              {airDate && <span className="text-[11px] text-white/50">·</span>}
            </>
          )}
          {airDate && <span className="text-[11px] text-white/50">{airDate}</span>}
          {episode.runtime > 0 && (
            <>
              <span className="text-[11px] text-white/50">·</span>
              <span className="text-[11px] text-white/50">
                {episode.runtime}m
              </span>
            </>
          )}
        </>
      }
    />
  )
}
