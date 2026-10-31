import "server-only";

import { cache } from "react";
import { report } from "@omerdlw/base-framework/utils";
import { getMovieDetails, searchMovies } from "@/infrastructure/tmdb/server";
import type { MovieSearchPage } from "@/infrastructure/tmdb/types";
import { BEST_PICTURE, ceremonyYear } from "../data/best-picture";
import { genreNames } from "../lib/genres";
import type { Laureate } from "../lib/types";
import { batched, kept, loglineOf } from "./keep";

type Hit = MovieSearchPage["results"][number];

const normal = (title: string) =>
  title
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// TMDB search is fuzzy, so the winner is the most-voted hit whose title
// matches and whose release sits within a year of the honoured one.
function winnerAmong(
  found: readonly Hit[],
  title: string,
  year: number,
): Hit | null {
  const wanted = normal(title);
  const fits = found.filter(
    (movie) =>
      movie.posterPath !== null &&
      movie.releaseYear !== null &&
      Math.abs(movie.releaseYear - year) <= 1 &&
      [movie.title, movie.originalTitle].some((name) => {
        const have = normal(name ?? "");
        return (
          have === wanted || have.startsWith(wanted) || wanted.startsWith(have)
        );
      }),
  );
  return fits.sort((a, b) => b.voteCount - a.voteCount)[0] ?? null;
}

async function readLaureates(): Promise<Laureate[]> {
  const films = await batched(BEST_PICTURE, 20, async ([title, year], i) => {
    const found = await searchMovies(title);
    const movie = found.success
      ? winnerAmong(found.data.results, title, year)
      : null;
    if (!movie?.posterPath) {
      report("Laureates", new Error(`No film for ${title} (${year})`));
      return null;
    }
    const details = await getMovieDetails(movie.id);
    const film = details.success ? details.data : null;
    const ceremony = i + 1;
    const laureate: Laureate = {
      backdropPath: movie.backdropPath,
      ceremony,
      ceremonyYear: ceremonyYear(ceremony),
      director:
        film?.credits.crew.find((member) => member.job === "Director")?.name ??
        null,
      genres: film
        ? film.genres.map((genre) => genre.name).slice(0, 3)
        : genreNames(movie.genreIds),
      honoured: year,
      id: movie.id,
      logline: loglineOf(film?.overview),
      posterPath: movie.posterPath,
      runtime: film?.runtimeMinutes ?? null,
      tagline: film?.tagline?.trim() || null,
      title,
      year: movie.releaseYear,
    };
    return laureate;
  });
  return films.filter((film): film is Laureate => film !== null);
}

export const getLaureates = cache(() =>
  kept("spotlight:laureates:v1", readLaureates),
);
