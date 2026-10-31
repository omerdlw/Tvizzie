import { err, ok, type Result } from "@omerdlw/base-framework/result";
import {
  TMDB_DEFAULT_LANGUAGE,
  TMDB_REVALIDATE,
  tmdbCacheTag,
} from "./constants";
import { tmdbErrors, type TmdbError } from "./errors";
import { featuredMoviePageSchema, foundMoviesSchema } from "./schemas/discover";
import type { TmdbTransport } from "./transport";
import type { FeaturedMovie, FeaturedMoviePage } from "./types";
import { checkLanguage, checkPage } from "./validation";

export const MOVIE_LISTS = [
  "now_playing",
  "popular",
  "top_rated",
  "upcoming",
] as const;
export type MovieList = (typeof MOVIE_LISTS)[number];

export const TRENDING_WINDOWS = ["day", "week"] as const;
export type TrendingWindow = (typeof TRENDING_WINDOWS)[number];

const DISCOVER_SORTS = [
  "popularity.desc",
  "vote_count.desc",
  "primary_release_date.desc",
  "primary_release_date.asc",
] as const;
export type DiscoverSort = (typeof DISCOVER_SORTS)[number];

const MIN_VOTES: Record<DiscoverSort, number> = {
  "popularity.desc": 150,
  "vote_count.desc": 0,
  "primary_release_date.desc": 40,
  "primary_release_date.asc": 300,
};

export interface ListOptions {
  language?: string;
  page?: number;
  signal?: AbortSignal;
}

export interface DiscoverOptions extends ListOptions {
  genre?: number | null;
  decade?: number | null;
  sort?: DiscoverSort;
}

export interface DiscoverApi {
  trending(
    window: TrendingWindow,
    options?: ListOptions,
  ): Promise<Result<FeaturedMoviePage, TmdbError>>;
  list(
    list: MovieList,
    options?: ListOptions,
  ): Promise<Result<FeaturedMoviePage, TmdbError>>;
  discover(
    options?: DiscoverOptions,
  ): Promise<Result<FeaturedMoviePage, TmdbError>>;
  findByImdb(
    imdbId: string,
    options?: ListOptions,
  ): Promise<Result<FeaturedMovie | null, TmdbError>>;
}

const IMDB_ID = /^tt\d{7,9}$/;

export function createDiscoverApi(transport: TmdbTransport): DiscoverApi {
  return {
    async trending(
      window,
      { language = TMDB_DEFAULT_LANGUAGE, page = 1, signal } = {},
    ) {
      const invalid = checkLanguage(language) ?? checkPage(page);
      if (invalid) return err(invalid);
      if (!TRENDING_WINDOWS.includes(window)) {
        return err(tmdbErrors.invalidRequest(`Unknown window "${window}"`));
      }

      return transport.request({
        path: `/trending/movie/${window}`,
        query: { language, page },
        schema: featuredMoviePageSchema,
        revalidate: TMDB_REVALIDATE.feed,
        tags: [tmdbCacheTag("discover")],
        signal,
      });
    },

    async list(
      list,
      { language = TMDB_DEFAULT_LANGUAGE, page = 1, signal } = {},
    ) {
      const invalid = checkLanguage(language) ?? checkPage(page);
      if (invalid) return err(invalid);
      if (!MOVIE_LISTS.includes(list)) {
        return err(tmdbErrors.invalidRequest(`Unknown list "${list}"`));
      }

      return transport.request({
        path: `/movie/${list}`,
        query: { language, page, region: "US" },
        schema: featuredMoviePageSchema,
        revalidate: TMDB_REVALIDATE.feed,
        tags: [tmdbCacheTag("discover")],
        signal,
      });
    },

    async discover({
      decade = null,
      genre = null,
      language = TMDB_DEFAULT_LANGUAGE,
      page = 1,
      signal,
      sort = "popularity.desc",
    } = {}) {
      const invalid = checkLanguage(language) ?? checkPage(page);
      if (invalid) return err(invalid);
      if (!DISCOVER_SORTS.includes(sort)) {
        return err(tmdbErrors.invalidRequest(`Unknown sort "${sort}"`));
      }
      if (genre !== null && !Number.isSafeInteger(genre)) {
        return err(tmdbErrors.invalidRequest("Genre must be an integer"));
      }
      if (decade !== null && !Number.isSafeInteger(decade)) {
        return err(tmdbErrors.invalidRequest("Decade must be an integer"));
      }

      return transport.request({
        path: "/discover/movie",
        query: {
          language,
          page,
          include_adult: false,
          include_video: false,
          sort_by: sort,
          with_genres: genre ?? undefined,
          "primary_release_date.gte":
            decade === null ? undefined : `${decade}-01-01`,
          "primary_release_date.lte":
            decade !== null
              ? `${decade + 9}-12-31`
              : sort === "primary_release_date.desc"
                ? new Date().toISOString().slice(0, 10)
                : undefined,
          "vote_count.gte": MIN_VOTES[sort],
        },
        schema: featuredMoviePageSchema,
        revalidate: TMDB_REVALIDATE.feed,
        tags: [tmdbCacheTag("discover")],
        signal,
      });
    },

    async findByImdb(
      imdbId,
      { language = TMDB_DEFAULT_LANGUAGE, signal } = {},
    ) {
      const invalid = checkLanguage(language);
      if (invalid) return err(invalid);
      if (!IMDB_ID.test(imdbId)) {
        return err(tmdbErrors.invalidRequest(`Not an IMDb id: "${imdbId}"`));
      }

      const found = await transport.request({
        path: `/find/${imdbId}`,
        query: { external_source: "imdb_id", language },
        schema: foundMoviesSchema,
        revalidate: TMDB_REVALIDATE.movie,
        signal,
      });
      return found.success ? ok(found.data[0] ?? null) : found;
    },
  };
}
