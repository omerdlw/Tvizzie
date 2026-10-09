import { err, type Result } from "@omerdlw/base-framework/result";
import {
  TMDB_CACHE_TAG,
  TMDB_DEFAULT_LANGUAGE,
  TMDB_REVALIDATE,
  TMDB_SEARCH_LIMITS,
} from "./constants";
import { tmdbErrors, type TmdbError } from "./errors";
import {
  featuredMoviePageSchema,
  trendingPeoplePageSchema,
} from "./schemas/discover";
import type { TmdbTransport } from "./transport";
import type { FeaturedMoviePage, PersonSearchPage } from "./types";
import { checkLanguage } from "./validation";

export const MOVIE_LISTS = [
  "now_playing",
  "popular",
  "top_rated",
  "upcoming",
] as const;
export type MovieList = (typeof MOVIE_LISTS)[number];

export const TRENDING_WINDOWS = ["day", "week"] as const;
export type TrendingWindow = (typeof TRENDING_WINDOWS)[number];

export const DISCOVER_SORTS = [
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

function discoverCacheTag(): string {
  return `${TMDB_CACHE_TAG}:discover`;
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
  trendingPeople(
    options?: ListOptions,
  ): Promise<Result<PersonSearchPage, TmdbError>>;
}

function checkPage(page: number): TmdbError | null {
  return Number.isInteger(page) &&
    page >= 1 &&
    page <= TMDB_SEARCH_LIMITS.maxPage
    ? null
    : tmdbErrors.invalidRequest(
        `Page must be an integer from 1 to ${TMDB_SEARCH_LIMITS.maxPage}`,
      );
}

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
        tags: [discoverCacheTag()],
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
        tags: [discoverCacheTag()],
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
            decade === null ? undefined : `${decade + 9}-12-31`,
          ...(sort === "primary_release_date.desc"
            ? {
                "primary_release_date.lte":
                  decade === null
                    ? new Date().toISOString().slice(0, 10)
                    : `${decade + 9}-12-31`,
              }
            : null),
          "vote_count.gte": MIN_VOTES[sort],
        },
        schema: featuredMoviePageSchema,
        revalidate: TMDB_REVALIDATE.feed,
        tags: [discoverCacheTag()],
        signal,
      });
    },

    async trendingPeople({
      language = TMDB_DEFAULT_LANGUAGE,
      page = 1,
      signal,
    } = {}) {
      const invalid = checkLanguage(language) ?? checkPage(page);
      if (invalid) return err(invalid);

      return transport.request({
        path: "/trending/person/week",
        query: { language, page },
        schema: trendingPeoplePageSchema,
        revalidate: TMDB_REVALIDATE.feed,
        tags: [discoverCacheTag()],
        signal,
      });
    },
  };
}
