import { uniqueBy } from '@/lib/utils'

const MAX_CAST = 14
const MAX_RECOMMENDATIONS = 14
const MAX_SIMILAR = 14
const MAX_KEYWORDS = 8

export function getTvComputedData(show) {
  if (!show) return {}

  const creators = show.created_by || []

  const rawCast = show.aggregate_credits?.cast || show.credits?.cast || []
  const cast = uniqueBy(rawCast).slice(0, MAX_CAST)

  const recommendations = (show.recommendations?.results || []).slice(
    0,
    MAX_RECOMMENDATIONS
  )

  const similar = (show.similar?.results || []).slice(0, MAX_SIMILAR)

  const keywords = (show.keywords?.results || []).slice(0, MAX_KEYWORDS)

  let certification = null
  const ratingsList = show.content_ratings?.results || []
  const currentRating =
    ratingsList.find((entry) => entry.iso_3166_1 === 'US') || ratingsList[0]
  if (currentRating) {
    certification = currentRating.rating
  }

  const year = show.first_air_date?.slice(0, 4)
  const lastAirYear = show.last_air_date?.slice(0, 4)
  const isEnded = show.status === 'Ended' || show.status === 'Canceled'
  const yearRange = year
    ? isEnded
      ? lastAirYear && year !== lastAirYear
        ? `${year}–${lastAirYear}`
        : year
      : `${year}–`
    : null

  const genres = show.genres?.map((genre) => genre.name) || []
  const rating = show.vote_average > 0 ? show.vote_average.toFixed(1) : null
  const imdbId = show.external_ids?.imdb_id || null

  const numberOfSeasons = show.number_of_seasons
  const numberOfEpisodes = show.number_of_episodes

  return {
    creators,
    cast,
    recommendations,
    similar,
    keywords,
    certification,
    year,
    yearRange,
    genres,
    rating,
    imdbId,
    numberOfSeasons,
    numberOfEpisodes,
  }
}
