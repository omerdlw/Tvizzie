import "server-only";
import type { MovieDetails } from "@/infrastructure/tmdb/types";

const TMDB_PATH = /^\/[A-Za-z0-9._-]{1,200}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function movieSnapshot(movie: MovieDetails) {
  const path = (value: string | null) =>
    value && TMDB_PATH.test(value) ? value : null;

  return {
    backdrop_path: path(movie.backdropPath),
    payload: {
      genre_ids: movie.genres.map((genre) => genre.id),
      vote_average: movie.voteAverage ?? null,
    },
    poster_path: path(movie.posterPath),
    release_date:
      movie.releaseDate && ISO_DATE.test(movie.releaseDate)
        ? movie.releaseDate
        : null,
    title: (
      movie.title.trim() ||
      movie.originalTitle?.trim() ||
      "Untitled"
    ).slice(0, 300),
  };
}
