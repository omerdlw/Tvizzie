import { z } from "zod";
import { isFilmTitle } from "../filters";
import {
  calendarDate,
  countOrZero,
  genreIds,
  lenientList,
  text,
  yearOf,
} from "./common";
import { personSummarySchema } from "./person";

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
    genreIds: m.genre_ids,
    video: m.video ?? false,
  }))
  .refine(isFilmTitle, "Not a film");

function pageSchema<S extends z.ZodType>(item: S) {
  return z
    .object({
      page: z.number().int().positive(),
      total_pages: countOrZero,
      total_results: countOrZero,
      results: lenientList(item),
    })
    .transform((p) => ({
      page: p.page,
      totalPages: p.total_pages,
      totalResults: p.total_results,
      results: p.results,
    }));
}

export const featuredMoviePageSchema = pageSchema(featuredMovieSchema);
export const trendingPeoplePageSchema = pageSchema(personSummarySchema);
