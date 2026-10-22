import "server-only";

import { err, ok, type Result } from "@omerdlw/base-framework/result";
import { USER_MESSAGES } from "@omerdlw/base-framework/utils";
import type { TmdbError } from "@/infrastructure/tmdb/types";
import {
  getPersonDetails,
  searchMovies,
  searchPeople,
} from "@/infrastructure/tmdb/server";
import {
  MATCH,
  RENOWN,
  bestMatch,
  fame,
  orderWeight,
  renown,
  splitYear,
} from "../lib/rank";
import type {
  MovieSearchResponse,
  PersonSearchResponse,
  SearchFailure,
  SearchFailureCode,
} from "../lib/types";
import { catalogMatches } from "./catalog";

const MESSAGES: Record<SearchFailureCode, string> = {
  aborted: "The search was cancelled",
  invalid_query: "Enter a valid search term",
  rate_limited: USER_MESSAGES.rateLimited,
  unavailable: "Search is unavailable right now. Please try again in a moment",
};

// TMDB answers in its own order, which leans on popularity and lets loose
// word matches in early ("La Güera, my forgotten land" for "la la land").
// The answer is re-ranked here: how closely the title reads as the query
// leads, how well known the film is follows, and TMDB's order breaks ties.
const FAME_WEIGHT = 0.5;
const ORDER_WEIGHT = 0.15;
const YEAR_BONUS = 0.4;
const NO_PICTURE_PENALTY = 0.2;

function toSearchFailure(error: TmdbError): SearchFailure {
  const code: SearchFailureCode =
    error.kind === "invalid_request"
      ? "invalid_query"
      : error.kind === "rate_limited"
        ? "rate_limited"
        : "unavailable";
  return { code, message: MESSAGES[code] };
}

function byScore<T>(rows: { hit: T; score: number }[]): T[] {
  return rows.sort((a, b) => b.score - a.score).map(({ hit }) => hit);
}

interface Film {
  id: number;
  originalTitle: string | null;
  popularity: number;
  posterPath: string | null;
  releaseYear: number | null;
  title: string;
  voteCount: number;
}

// The films a name brings to mind: "nolan" is asked for Christopher
// Nolan's films as much as for titles with Nolan in them. Only a person
// who stands out is followed: a famous name well ahead of the next one
// with it, not one Chris among many.
const CREDIT_MATCH = 0.75;
const CREDIT_FILMS = 8;
const STANDOUT_RENOWN = 0.45;
const STANDOUT_LEAD = 1.5;

async function standoutCredits(
  query: string,
  signal?: AbortSignal,
): Promise<{ films: Film[]; score: number } | null> {
  const found = await searchPeople(query, { signal });
  if (!found.success) return null;

  const named = found.data.results
    .filter((person) => bestMatch([person.name], query) >= MATCH.phrase)
    .sort((a, b) => b.popularity - a.popularity);
  const [first, second] = named;
  if (!first || renown(first, RENOWN.person) < STANDOUT_RENOWN) return null;
  if (second && first.popularity < second.popularity * STANDOUT_LEAD) {
    return null;
  }

  const details = await getPersonDetails(first.id);
  if (!details.success) return null;
  const { credits, knownForDepartment: department } = details.data;
  const work =
    department === "Acting" || !department
      ? credits.cast
      : credits.crew.filter(
          (credit) =>
            credit.department === department &&
            (department !== "Directing" || credit.job === "Director"),
        );

  const seen = new Set<number>();
  const films = [...work]
    .sort((a, b) => b.voteCount - a.voteCount)
    .filter((film) => !seen.has(film.id) && Boolean(seen.add(film.id)))
    .slice(0, CREDIT_FILMS);
  return {
    films,
    score: bestMatch([first.name], query) + renown(first, RENOWN.person),
  };
}

export async function searchMovieHits(
  query: string,
  options: { page?: number; signal?: AbortSignal } = {},
): Promise<Result<MovieSearchResponse, SearchFailure>> {
  // "dune 1984" is asked both ways at once: as a film from 1984 and, in
  // case the year belongs to the title ("death race 2000"), word for word.
  const dated = splitYear(query);
  const first = (options.page ?? 1) === 1;
  const [plain, narrowed, typed, credited] = await Promise.all([
    searchMovies(query, options),
    dated
      ? searchMovies(dated.title, { ...options, year: dated.year })
      : Promise.resolve(null),
    first ? catalogMatches(query) : Promise.resolve([]),
    first
      ? standoutCredits(query, options.signal).catch(() => null)
      : Promise.resolve(null),
  ]);
  if (!plain.success && !narrowed?.success) {
    return err(toSearchFailure(plain.error));
  }

  const pages = [narrowed, plain].flatMap((result) =>
    result?.success ? [result.data] : [],
  );
  const creditIds = new Set(credited?.films.map((film) => film.id));
  const rows = new Map<number, { film: Film; order: number }>();
  const add = (film: Film, order: number) => {
    if (!rows.has(film.id)) rows.set(film.id, { film, order });
  };
  for (const { results } of pages) {
    results.forEach((movie, index) =>
      add(movie, orderWeight(index, results.length)),
    );
  }
  typed.forEach((film) => add(film, 0.5));
  credited?.films.forEach((film) => add(film, 0.5));

  const list = [...rows.values()];
  const known = fame(
    list.map(({ film }) => ({
      popularity: film.popularity,
      votes: film.voteCount,
    })),
  );

  const hits = byScore(
    list.map(({ film, order }, index) => {
      const titles = [film.title, film.originalTitle];
      const credit = creditIds.has(film.id);
      const match = Math.max(
        bestMatch(titles, query),
        dated ? bestMatch(titles, dated.title) : 0,
        credit ? CREDIT_MATCH : 0,
      );
      const year = dated && film.releaseYear === dated.year ? YEAR_BONUS : 0;
      const signals = { popularity: film.popularity, votes: film.voteCount };
      // A film found through its person ranks just behind that person in
      // the overview, so "nolan" opens on him and then on his films.
      const standing = match + year + renown(signals, RENOWN.movie);
      return {
        hit: {
          id: film.id,
          match,
          posterPath: film.posterPath,
          score:
            credit && credited
              ? Math.min(standing, credited.score - 0.01)
              : standing,
          title: film.title,
          year: film.releaseYear,
        },
        score:
          match +
          year +
          FAME_WEIGHT * known[index] +
          ORDER_WEIGHT * order -
          (film.posterPath ? 0 : NO_PICTURE_PENALTY),
      };
    }),
  );

  const { page, totalPages, totalResults } = plain.success
    ? plain.data
    : pages[0];
  return ok({ hits, page, totalPages, totalResults });
}

export async function searchPersonHits(
  query: string,
  options: { page?: number; signal?: AbortSignal } = {},
): Promise<Result<PersonSearchResponse, SearchFailure>> {
  const result = await searchPeople(query, options);
  if (!result.success) return err(toSearchFailure(result.error));

  const { page, results, totalPages, totalResults } = result.data;
  const known = fame(results.map(({ popularity }) => ({ popularity })));

  const hits = byScore(
    results.map((person, index) => {
      const match = bestMatch([person.name], query);
      return {
        hit: {
          department: person.knownForDepartment,
          id: person.id,
          knownFor: person.knownFor.slice(0, 2),
          match,
          name: person.name,
          profilePath: person.profilePath,
          score: match + renown(person, RENOWN.person),
        },
        score:
          match +
          FAME_WEIGHT * known[index] +
          ORDER_WEIGHT * orderWeight(index, results.length) -
          (person.profilePath ? 0 : NO_PICTURE_PENALTY),
      };
    }),
  );

  return ok({ hits, page, totalPages, totalResults });
}
