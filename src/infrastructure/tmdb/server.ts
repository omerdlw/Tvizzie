import "server-only";

import { cache } from "react";
import { report } from "@omerdlw/base-framework/utils";
import { getTmdbConfig } from "../env";
import { createTmdbClient, type TmdbClient } from "./client";
import type {
  DiscoverOptions,
  ListOptions,
  MovieList,
  TrendingWindow,
} from "./discover";
import type { MovieDetailsOptions, MovieSearchOptions } from "./movies";
import type { PersonDetailsOptions, PersonSearchOptions } from "./people";

let client: TmdbClient | undefined;

function getTmdb(): TmdbClient {
  client ??= createTmdbClient({
    config: getTmdbConfig,
    onError: (error, path) => report(`TMDB ${path}`, error),
  });
  return client;
}

export const getMovieDetails = cache(
  (id: number, language?: MovieDetailsOptions["language"]) =>
    getTmdb().movies.getDetails(id, { language }),
);

export function searchMovies(query: string, options?: MovieSearchOptions) {
  return getTmdb().movies.search(query, options);
}

export const getPersonDetails = cache(
  (id: number, language?: PersonDetailsOptions["language"]) =>
    getTmdb().people.getDetails(id, { language }),
);

export const getPersonAwards = cache((id: number) =>
  getTmdb().awards.forPerson(id),
);

export const getMovieAwards = cache((id: number) =>
  getTmdb().awards.forMovie(id),
);

export function searchPeople(query: string, options?: PersonSearchOptions) {
  return getTmdb().people.search(query, options);
}

export function getTrendingMovies(
  window: TrendingWindow,
  options?: ListOptions,
) {
  return getTmdb().discover.trending(window, options);
}

export function getMovieList(list: MovieList, options?: ListOptions) {
  return getTmdb().discover.list(list, options);
}

export function discoverMovies(options?: DiscoverOptions) {
  return getTmdb().discover.discover(options);
}

export function getTrendingPeople(options?: ListOptions) {
  return getTmdb().discover.trendingPeople(options);
}
