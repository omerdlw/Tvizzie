'use client'

import { TMDB_IMG } from '@/lib/constants'

import MediaCard from '@/components/shared/media-card'
import Icon from '@/ui/icon'


export default function FilmographyCard({ credit }) {
  const isMovie = credit.media_type === 'movie'
  const title = isMovie
    ? credit.title || credit.original_title
    : credit.name || credit.original_name
  const year = (isMovie ? credit.release_date : credit.first_air_date)?.slice(
    0,
    4
  )
  const href = isMovie ? `/movie/${credit.id}` : `/tv/${credit.id}`
  const character = credit.character
  const rating = credit.vote_average > 0 ? credit.vote_average.toFixed(1) : null

  return (
    <MediaCard
      href={href}
      className="w-[calc((100%-12px)/2)] sm:w-[calc((100%-24px)/3)] md:w-[calc((100%-48px)/4)] lg:w-[calc((100%-48px)/5)]"
      imageSrc={credit.poster_path ? `${TMDB_IMG}/w342${credit.poster_path}` : null}
      imageAlt={title}
      imageSizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
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
      bottomContent={
        character ? (
          <p className="truncate px-1 text-[10px] text-white/50">
            as {character}
          </p>
        ) : null
      }
    />
  )
}
