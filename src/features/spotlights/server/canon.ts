import "server-only";

import { cache } from "react";
import { report } from "@omerdlw/base-framework/utils";
import { findMovieByImdb } from "@/infrastructure/tmdb/server";
import { CANON } from "../data/imdb-top-100";
import { genreNames } from "../lib/genres";
import type { CanonFilm } from "../lib/types";
import { batched, kept } from "./keep";

async function readCanon(): Promise<CanonFilm[]> {
  const films = await batched(CANON, 20, async ([imdbId, title, year], i) => {
    const found = await findMovieByImdb(imdbId);
    const movie = found.success ? found.data : null;
    if (!movie?.posterPath) {
      report("Canon", new Error(`No poster for ${imdbId} (${title})`));
      return null;
    }
    if (movie.releaseYear !== null && Math.abs(movie.releaseYear - year) > 1) {
      report(
        "Canon",
        new Error(`${imdbId} is ${movie.title}, expected ${title} (${year})`),
      );
      return null;
    }
    const film: CanonFilm = {
      backdropPath: movie.backdropPath,
      genres: genreNames(movie.genreIds),
      id: movie.id,
      posterPath: movie.posterPath,
      rank: i + 1,
      rating: movie.voteAverage,
      title,
      votes: movie.voteCount,
      year,
    };
    return film;
  });
  return films.filter((film): film is CanonFilm => film !== null);
}

export const getCanon = cache(() => kept("spotlight:canon:v1", readCanon));
