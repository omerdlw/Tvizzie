import { err, type Result } from "@omerdlw/base-framework/result";
import {
  TMDB_CACHE_TAG,
  TMDB_DEFAULT_LANGUAGE,
  TMDB_REVALIDATE,
} from "./constants";
import { tmdbErrors, type TmdbError } from "./errors";
import { movieDetailsSchema, movieImagesSchema } from "./schemas/movie";
import { movieSearchPageSchema } from "./schemas/search";
import type { TmdbTransport } from "./transport";
import type { MovieDetails, MovieImages, MovieSearchPage } from "./types";
import { checkLanguage, checkSearchInput } from "./validation";

export interface MovieDetailsOptions {
  language?: string;
  signal?: AbortSignal;
}

export interface MovieSearchOptions extends MovieDetailsOptions {
  page?: number;
  year?: number;
}

const APPENDED_RESOURCES = [
  "credits",
  "images",
  "videos",
  "release_dates",
  "recommendations",
  "watch/providers",
  "external_ids",
  "keywords",
].join(",");

function movieCacheTag(id: number): string {
  return `${TMDB_CACHE_TAG}:movie:${id}`;
}

export function isMovieId(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

export interface MoviesApi {
  getDetails(
    id: number,
    options?: MovieDetailsOptions,
  ): Promise<Result<MovieDetails, TmdbError>>;
  getImages(
    id: number,
    options?: Pick<MovieDetailsOptions, "signal">,
  ): Promise<Result<MovieImages, TmdbError>>;
  search(
    query: string,
    options?: MovieSearchOptions,
  ): Promise<Result<MovieSearchPage, TmdbError>>;
}

export function createMoviesApi(transport: TmdbTransport): MoviesApi {
  return {
    async getDetails(id, { language = TMDB_DEFAULT_LANGUAGE, signal } = {}) {
      if (!isMovieId(id)) {
        return err(
          tmdbErrors.invalidRequest("Movie id must be a positive integer"),
        );
      }
      const languageError = checkLanguage(language);
      if (languageError) return err(languageError);

      return transport.request({
        path: `/movie/${id}`,
        query: {
          language,
          append_to_response: APPENDED_RESOURCES,
          include_image_language: `${language.slice(0, 2)},null`,
        },
        schema: movieDetailsSchema,
        revalidate: TMDB_REVALIDATE.movie,
        tags: [movieCacheTag(id)],
        signal,
      });
    },

    // Asked for without a language, TMDB sends the pictures of every one.
    async getImages(id, { signal } = {}) {
      if (!isMovieId(id)) {
        return err(
          tmdbErrors.invalidRequest("Movie id must be a positive integer"),
        );
      }
      return transport.request({
        path: `/movie/${id}/images`,
        schema: movieImagesSchema,
        revalidate: TMDB_REVALIDATE.movie,
        tags: [movieCacheTag(id)],
        signal,
      });
    },

    async search(
      query,
      { language = TMDB_DEFAULT_LANGUAGE, page = 1, signal, year } = {},
    ) {
      const checked = checkSearchInput(query, page, language);
      if ("error" in checked) return err(checked.error);

      return transport.request({
        path: "/search/movie",
        query: {
          query: checked.query,
          language,
          page,
          include_adult: false,
          ...(year ? { primary_release_year: year } : {}),
        },
        schema: movieSearchPageSchema,
        revalidate: TMDB_REVALIDATE.search,
        signal,
      });
    },
  };
}
