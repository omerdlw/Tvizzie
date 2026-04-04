import { TMDB_IMG } from '@/core/constants';
import { formatRuntime, uniqueBy } from '@/core/utils';

const MAX_CAST = 14;
const MAX_WRITERS = 10;
const MAX_RECOMMENDATIONS = 14;
const MAX_SIMILAR = 14;

export function getMovieComputedData(movie) {
  if (!movie) {
    return {};
  }

  const director = movie.credits?.crew?.find((member) => member.job === 'Director');

  const writers = uniqueBy(movie.credits?.crew?.filter((member) => member.department === 'Writing') || [], 'id').slice(
    0,
    MAX_WRITERS
  );

  const cast = uniqueBy(movie.credits?.cast || []).slice(0, MAX_CAST);
  const recommendations = (movie.recommendations?.results || []).slice(0, MAX_RECOMMENDATIONS);
  const similar = (movie.similar?.results || []).slice(0, MAX_SIMILAR);

  let certification = null;
  const releases = movie.release_dates?.results || [];
  const usRelease = releases.find((release) => release.iso_3166_1 === 'US');

  if (usRelease) {
    certification = usRelease.release_dates.find((entry) => entry.certification)?.certification;
  }

  return {
    cast,
    certification,
    director,
    genres: movie.genres?.map((genre) => genre.name) || [],
    rating: movie.vote_average > 0 ? movie.vote_average.toFixed(1) : null,
    recommendations,
    runtimeText: movie.runtime ? formatRuntime(movie.runtime) : null,
    similar,
    writers,
    year: movie.release_date?.slice(0, 4),
  };
}

export function getGalleryImages(images) {
  return (images?.backdrops || [])
    .filter((image) => image.file_path && !image.iso_639_1)
    .sort(
      (first, second) =>
        (second.vote_average || 0) - (first.vote_average || 0) || (second.vote_count || 0) - (first.vote_count || 0)
    )
    .slice(0, 20);
}

export function getPreferredMovieBackground(images) {
  const bestImage = getGalleryImages(images)[0];

  if (!bestImage?.file_path) {
    return null;
  }

  return `${TMDB_IMG}/original${bestImage.file_path}`;
}
