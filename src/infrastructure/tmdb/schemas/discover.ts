import { z } from "zod";
import { isFilmTitle } from "../filters";
import {
  calendarDate,
  countOrZero,
  genreIds,
  lenientList,
  pageSchema,
  text,
  yearOf,
} from "./common";

const featuredMovieSchema = z
  .object({
    id: z.number().int().positive(),
    title: z.string(),
    release_date: calendarDate,
    poster_path: text,
    backdrop_path: text,
    overview: text,
    popularity: countOrZero,
    vote_count: countOrZero,
    vote_average: z.number().nullish(),
    genre_ids: genreIds,
    video: z.boolean().nullish(),
  })
  .transform((m) => ({
    id: m.id,
    title: m.title,
    releaseDate: m.release_date,
    releaseYear: yearOf(m.release_date),
    posterPath: m.poster_path,
    backdropPath: m.backdrop_path,
    overview: m.overview,
    popularity: m.popularity,
    voteCount: m.vote_count,
    voteAverage: m.vote_average ?? null,
    genreIds: m.genre_ids,
    video: m.video ?? false,
  }))
  .refine(isFilmTitle, "Not a film");

export const featuredMoviePageSchema = pageSchema(featuredMovieSchema);

export const foundMoviesSchema = z
  .object({ movie_results: lenientList(featuredMovieSchema) })
  .transform((found) => found.movie_results);
