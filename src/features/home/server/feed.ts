import "server-only";

import { cache } from "react";
import { ok, type Result } from "@omerdlw/base-framework/result";
import type { DiscoverOptions } from "@/infrastructure/tmdb/discover";
import { report } from "@omerdlw/base-framework/utils";
import {
  discoverMovies,
  findMovieByImdb,
  getMovieList,
  getPersonDetails,
  getTrendingMovies,
  searchMovies,
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
import { BEST_PICTURE, ceremonyYear } from "../lib/best-picture";
import { CANON } from "../lib/canon";
import { DIRECTORS } from "../lib/directors";
import type {
  CanonMovie,
  Director,
  DiscoverResponse,
  HomeFeed,
  HomeMovie,
  LaureateMovie,
  ShowingMovie,
  TrendingMovie,
} from "../lib/types";
import { byPopularity, distinct } from "../lib/curate";

const DAY = 24 * 60 * 60 * 1000;

type Listed = Pick<
  FeaturedMovie,
  | "backdropPath"
  | "genreIds"
  | "id"
  | "posterPath"
  | "releaseDate"
  | "releaseYear"
  | "title"
>;

function toHomeMovie(movie: Listed): HomeMovie {
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

const hasPoster = (movie: Pick<FeaturedMovie, "posterPath">) =>
  movie.posterPath !== null;
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

const toShowing = (movie: FeaturedMovie): ShowingMovie => ({
  ...toHomeMovie(movie),
  logline: loglineOf(movie.overview),
});

const isoDate = (time: number) => new Date(time).toISOString().slice(0, 10);

// TMDB takes the chart a few films at a time, so a cold cache does not
// trip its rate limit.
const CANON_BATCH = 20;

async function getCanon(): Promise<CanonMovie[]> {
  const films: CanonMovie[] = [];
  for (let from = 0; from < CANON.length; from += CANON_BATCH) {
    const batch = CANON.slice(from, from + CANON_BATCH);
    const found = await Promise.all(
      batch.map(([imdbId]) => findMovieByImdb(imdbId)),
    );
    found.forEach((outcome, i) => {
      const [imdbId, title, year] = batch[i]!;
      const movie = outcome.success ? outcome.data : null;
      if (!movie || !hasPoster(movie)) {
        report("Canon", new Error(`No poster for ${imdbId} (${title})`));
        return;
      }
      if (
        movie.releaseYear !== null &&
        Math.abs(movie.releaseYear - year) > 1
      ) {
        report(
          "Canon",
          new Error(`${imdbId} is ${movie.title}, expected ${title} (${year})`),
        );
        return;
      }
      films.push({
        ...toHomeMovie(movie),
        rank: from + i + 1,
        rating: movie.voteAverage,
      });
    });
  }
  return films;
}

type SearchHit = Listed & {
  originalTitle: string | null;
  voteCount: number;
};

const normal = (title: string) =>
  title
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// The film a title and year name: a release within a year of the one given,
// whose title is, or holds, the one searched for, and of those the one most
// people have voted on.
function laureateAmong(
  found: readonly SearchHit[],
  title: string,
  year: number,
): SearchHit | null {
  const wanted = normal(title);
  const fits = found.filter(
    (movie) =>
      hasPoster(movie) &&
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

async function getLaureates(): Promise<LaureateMovie[]> {
  const films: LaureateMovie[] = [];
  for (let from = 0; from < BEST_PICTURE.length; from += CANON_BATCH) {
    const batch = BEST_PICTURE.slice(from, from + CANON_BATCH);
    const found = await Promise.all(
      batch.map(([title]) => searchMovies(title)),
    );
    found.forEach((outcome, i) => {
      const [title, year] = batch[i]!;
      const movie = outcome.success
        ? laureateAmong(outcome.data.results, title, year)
        : null;
      if (!movie) {
        report("Laureates", new Error(`No film for ${title} (${year})`));
        return;
      }
      const ceremony = from + i + 1;
      films.push({
        ...toHomeMovie(movie),
        ceremony,
        ceremonyYear: ceremonyYear(ceremony),
      });
    });
  }
  return films;
}

// The directors one at a time, each with their films together, so a cold
// cache asks TMDB for a few things at once and not for all sixty.
async function getDirectors(): Promise<Director[]> {
  const directors: Director[] = [];
  for (const [i, entry] of DIRECTORS.entries()) {
    const [person, ...found] = await Promise.all([
      getPersonDetails(entry.person),
      ...entry.films.map(([imdbId]) => findMovieByImdb(imdbId)),
    ]);
    const films = found.flatMap<HomeMovie>((outcome, k) => {
      const [imdbId, title, year] = entry.films[k]!;
      const movie = outcome.success ? outcome.data : null;
      if (!movie || !hasPoster(movie)) {
        report("Directors", new Error(`No poster for ${imdbId} (${title})`));
        return [];
      }
      // The id names the film; the title and year are the list's own, which
      // can differ from TMDB's by a translation or a later release.
      return [{ ...toHomeMovie(movie), title, year }];
    });
    if (films.length === 0) continue;
    directors.push({
      born: entry.born,
      died: entry.died,
      films,
      id: entry.person,
      name: entry.name,
      profilePath: person.success ? person.data.profilePath : null,
      rank: i + 1,
    });
  }
  return directors;
}

export const getHomeFeed = cache(async (): Promise<HomeFeed> => {
  const [week, playing, upcoming, upcomingNext, canon, laureates, directors] =
    await Promise.all([
      getTrendingMovies("week"),
      getMovieList("now_playing"),
      getMovieList("upcoming"),
      getMovieList("upcoming", { page: 2 }),
      getCanon(),
      getLaureates(),
      getDirectors(),
    ]);
  const now = Date.now();
  const today = isoDate(now);

  return {
    canon,
    directors,
    laureates,
    // The ten most watched films that have opened, in the order they opened:
    // the tunnel walks through time.
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
      .sort((a, b) => (a.releaseDate ?? "").localeCompare(b.releaseDate ?? ""))
      .map(toShowing),
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
      .map(toShowing),
    today,
    // TMDB's own weekly order: the chart is theirs, not a curation of ours.
    trending: distinct(results(week))
      .flatMap<TrendingMovie>((movie) =>
        movie.backdropPath
          ? [{ ...toShowing(movie), backdropPath: movie.backdropPath }]
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
