import "server-only";

import { cache } from "react";
import { ok, type Result } from "@omerdlw/base-framework/result";
import type { DiscoverOptions } from "@/infrastructure/tmdb/discover";
import {
  discoverMovies,
  getMovieList,
  getTrendingMovies,
} from "@/infrastructure/tmdb/server";
import type {
  FeaturedMovie,
  FeaturedMoviePage,
  TmdbError,
} from "@/infrastructure/tmdb/types";
import {
  DISCOVER_PAGE_SIZE,
  GENRE_LABELS,
  SHOWING_LENGTH,
  TRENDING_LENGTH,
} from "../lib/constants";
import type {
  DiscoverResponse,
  HomeFeed,
  HomeMovie,
  TrendingMovie,
} from "../lib/types";
import { byPopularity, distinct } from "../lib/curate";

const DAY = 24 * 60 * 60 * 1000;

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

const hasPoster = (movie: FeaturedMovie) => movie.posterPath !== null;
const THEATRES_MIN_VOTES = 25;

const results = (
  outcome: Result<FeaturedMoviePage, TmdbError>,
): FeaturedMovie[] => (outcome.success ? outcome.data.results : []);

const LOGLINE_LENGTH = 170;

function loglineOf(overview: string | null | undefined): string | null {
  const flat = overview?.replace(/\s+/g, " ").trim();
  if (!flat) return null;
  // A sentence ends at a stop followed by a capital, so "L.A." and "Dr." do
  // not cut a logline short.
  const sentences = flat.match(/.+?[.!?](?=\s+["“‘']?[A-Z]|$)|.+$/g) ?? [flat];
  let line = "";
  for (const sentence of sentences) {
    const next = `${line} ${sentence.trim()}`.trim();
    if (line && next.length > LOGLINE_LENGTH) break;
    line = next;
    if (line.length >= 60) break;
  }
  if (line.length <= LOGLINE_LENGTH) return line;
  return `${line.slice(0, LOGLINE_LENGTH).replace(/\s+\S*$/, "")}…`;
}

const isoDate = (time: number) => new Date(time).toISOString().slice(0, 10);

export const getHomeFeed = cache(async (): Promise<HomeFeed> => {
  const [week, playing, upcoming, upcomingNext] = await Promise.all([
    getTrendingMovies("week"),
    getMovieList("now_playing"),
    getMovieList("upcoming"),
    getMovieList("upcoming", { page: 2 }),
  ]);
  const now = Date.now();
  const today = isoDate(now);

  return {
    // The ten most watched films that have opened, by popularity.
    theatres: byPopularity(
      distinct(
        results(playing).filter(
          (movie) =>
            hasPoster(movie) &&
            movie.voteCount >= THEATRES_MIN_VOTES &&
            (movie.releaseDate ?? "") <= today,
        ),
      ),
    )
      .slice(0, SHOWING_LENGTH)
      .map(toHomeMovie),
    // The ten most awaited films still to open, in the order they open.
    soon: byPopularity(
      distinct(
        [...results(upcoming), ...results(upcomingNext)].filter(
          (movie) => hasPoster(movie) && (movie.releaseDate ?? "") > today,
        ),
      ),
    )
      .slice(0, SHOWING_LENGTH)
      .sort((a, b) => (a.releaseDate ?? "").localeCompare(b.releaseDate ?? ""))
      .map(toHomeMovie),
    today,
    // TMDB's own weekly order: the chart is theirs, not a curation of ours.
    trending: distinct(results(week))
      .flatMap<TrendingMovie>((movie) =>
        movie.backdropPath
          ? [
              {
                ...toHomeMovie(movie),
                backdropPath: movie.backdropPath,
                logline: loglineOf(movie.overview),
              },
            ]
          : [],
      )
      .slice(0, TRENDING_LENGTH),
    week: { from: isoDate(now - 6 * DAY), to: today },
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
