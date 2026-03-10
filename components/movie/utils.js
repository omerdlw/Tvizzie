import { formatRuntime, uniqueBy } from '@/lib/utils'

const MAX_CAST = 14
const MAX_WRITERS = 10
const MAX_RECOMMENDATIONS = 14
const MAX_SIMILAR = 14
const MAX_KEYWORDS = 8

export function getMovieComputedData(movie) {
  if (!movie) return {}

  const director = movie.credits?.crew?.find(
    (member) => member.job === 'Director'
  )

  const writers = uniqueBy(
    movie.credits?.crew?.filter((member) => member.department === 'Writing') ||
      [],
    'id'
  ).slice(0, MAX_WRITERS)

  const cast = uniqueBy(movie.credits?.cast || []).slice(0, MAX_CAST)

  const recommendations = (movie.recommendations?.results || []).slice(
    0,
    MAX_RECOMMENDATIONS
  )

  const similar = (movie.similar?.results || []).slice(0, MAX_SIMILAR)

  const keywords = (movie.keywords?.keywords || []).slice(0, MAX_KEYWORDS)

  let certification = null
  const releases = movie.release_dates?.results || []
  const usRelease = releases.find((release) => release.iso_3166_1 === 'US')
  if (usRelease) {
    certification = usRelease.release_dates.find(
      (entry) => entry.certification
    )?.certification
  }

  const year = movie.release_date?.slice(0, 4)
  const runtimeText = movie.runtime ? formatRuntime(movie.runtime) : null
  const genres = movie.genres?.map((genre) => genre.name) || []
  const rating = movie.vote_average > 0 ? movie.vote_average.toFixed(1) : null
  const imdbId = movie.external_ids?.imdb_id || movie.imdb_id || null

  return {
    director,
    writers,
    cast,
    recommendations,
    similar,
    keywords,
    certification,
    year,
    runtimeText,
    genres,
    rating,
    imdbId,
  }
}
