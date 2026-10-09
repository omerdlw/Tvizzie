import "server-only";

import { cache } from "react";
import { ok, type Result } from "@omerdlw/base-framework/result";
import type { DiscoverOptions } from "@/infrastructure/tmdb/discover";
import {
  discoverMovies,
  getMovieList,
  getTrendingMovies,
  getTrendingPeople,
} from "@/infrastructure/tmdb/server";
import type {
  FeaturedMovie,
  FeaturedMoviePage,
  PersonSearchPage,
  TmdbError,
} from "@/infrastructure/tmdb/types";
import {
  BOARD_LENGTH,
  DISCOVER_PAGE_SIZE,
  GENRE_LABELS,
  REEL_LENGTH,
  TICKER_LENGTH,
} from "../lib/constants";
import type {
  DiscoverResponse,
  HomeFeed,
  HomeMovie,
  HomePerson,
  PulseMovie,
  ReelMovie,
} from "../lib/types";
import {
  byPopularity,
  distinct,
  notable,
  rankTrending,
  spreadGenres,
} from "../lib/curate";
import { getCommunityPopular } from "./popular";

const THEATRES_MIN_VOTES = 25;
const TRENDING_MIN_VOTES = 120;
const REEL_COMMUNITY_MAX = 4;

function toHomeMovie(movie: FeaturedMovie): HomeMovie {
  return {
    backdropPath: movie.backdropPath,
    genres: movie.genreIds
      .flatMap((id) => (GENRE_LABELS[id] ? [GENRE_LABELS[id]] : []))
      .slice(0, 3),
    id: movie.id,
    posterPath: movie.posterPath,
    releaseDate: movie.releaseDate,
    title: movie.title,
    year: movie.releaseYear,
  };
}

const results = (
  outcome: Result<FeaturedMoviePage, TmdbError>,
): FeaturedMovie[] => (outcome.success ? outcome.data.results : []);

const hasPoster = (movie: FeaturedMovie) => movie.posterPath !== null;
const canLead = (movie: FeaturedMovie) =>
  movie.backdropPath !== null && movie.posterPath !== null;

function names(outcome: Result<PersonSearchPage, TmdbError>): HomePerson[] {
  if (!outcome.success) return [];
  return outcome.data.results
    .slice(0, TICKER_LENGTH)
    .map((person) => ({ id: person.id, name: person.name }));
}

function communityNote(movie: PulseMovie): string {
  if (movie.reviewers >= 2)
    return `${movie.reviewers} wrote about it this week`;
  if (movie.watchers >= 1) return `${movie.watchers} watched it this week`;
  if (movie.likers >= 1) return `${movie.likers} liked it this week`;
  return `${movie.listers} want to watch it`;
}

function buildReel(
  community: readonly PulseMovie[],
  trending: readonly FeaturedMovie[],
  genresById: ReadonlyMap<number, string[]>,
): ReelMovie[] {
  const picked = community
    .filter((movie) => movie.backdropPath && movie.posterPath)
    .slice(0, REEL_COMMUNITY_MAX)
    .map<ReelMovie>((movie) => ({
      ...movie,
      genres: genresById.get(movie.id) ?? [],
      note: communityNote(movie),
    }));
  const taken = new Set(picked.map((movie) => movie.id));

  const rest = spreadGenres(
    rankTrending(
      distinct(notable(trending.filter(canLead), TRENDING_MIN_VOTES)),
    ),
    { limit: 2, within: REEL_LENGTH },
  )
    .filter((movie) => !taken.has(movie.id))
    .slice(0, REEL_LENGTH - picked.length)
    .map<ReelMovie>((movie) => ({
      ...toHomeMovie(movie),
      note: "Trending this week",
    }));

  return [...picked, ...rest];
}

const today = () => new Date().toISOString().slice(0, 10);

export const getHomeFeed = cache(async (): Promise<HomeFeed> => {
  const [week, day, nowPlaying, upcoming, popular, people, community] =
    await Promise.all([
      getTrendingMovies("week"),
      getTrendingMovies("day"),
      getMovieList("now_playing"),
      getMovieList("upcoming"),
      discoverMovies({ sort: "popularity.desc" }),
      getTrendingPeople(),
      getCommunityPopular(),
    ]);

  const trending = distinct([...results(week), ...results(day)]);
  const genresById = new Map<number, string[]>();
  for (const movie of [
    ...trending,
    ...results(nowPlaying),
    ...results(popular),
  ]) {
    genresById.set(movie.id, toHomeMovie(movie).genres);
  }

  return {
    discover: results(popular)
      .filter(hasPoster)
      .slice(0, DISCOVER_PAGE_SIZE)
      .map(toHomeMovie),
    names: names(people),
    pulse: community.slice(0, 9).filter((movie) => movie.posterPath),
    reel: buildReel(community, trending, genresById),
    soon: byPopularity(
      distinct(
        results(upcoming).filter(
          (movie) => hasPoster(movie) && (movie.releaseDate ?? "") >= today(),
        ),
      ),
    )
      .slice(0, BOARD_LENGTH)
      .sort((a, b) => (a.releaseDate ?? "").localeCompare(b.releaseDate ?? ""))
      .map(toHomeMovie),
    theatres: byPopularity(
      distinct(
        notable(results(nowPlaying).filter(hasPoster), THEATRES_MIN_VOTES),
      ),
    )
      .slice(0, BOARD_LENGTH)
      .map(toHomeMovie),
  };
});

export async function getDiscoverPage(
  options: DiscoverOptions,
): Promise<Result<DiscoverResponse, TmdbError>> {
  const outcome = await discoverMovies(options);
  if (!outcome.success) return outcome;

  const { page, results: films, totalPages } = outcome.data;
  return ok({
    hasMore: page < totalPages,
    movies: distinct(films.filter(hasPoster))
      .slice(0, DISCOVER_PAGE_SIZE)
      .map(toHomeMovie),
    page,
  });
}
