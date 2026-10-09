import "server-only";

import { err, ok, type Result } from "@omerdlw/base-framework/result";
import { USER_MESSAGES } from "@omerdlw/base-framework/utils";
import type { TmdbError } from "@/infrastructure/tmdb/types";
import { searchMovies, searchPeople } from "@/infrastructure/tmdb/server";
import type {
  MovieSearchResponse,
  PersonSearchResponse,
  SearchFailure,
  SearchFailureCode,
} from "../lib/types";

const MESSAGES: Record<SearchFailureCode, string> = {
  aborted: "The search was cancelled",
  invalid_query: "Enter a valid search term",
  rate_limited: USER_MESSAGES.rateLimited,
  unavailable: "Search is unavailable right now. Please try again in a moment",
};

function toSearchFailure(error: TmdbError): SearchFailure {
  const code: SearchFailureCode =
    error.kind === "invalid_request"
      ? "invalid_query"
      : error.kind === "rate_limited"
        ? "rate_limited"
        : "unavailable";
  return { code, message: MESSAGES[code] };
}

export async function searchMovieHits(
  query: string,
  options: { page?: number; signal?: AbortSignal } = {},
): Promise<Result<MovieSearchResponse, SearchFailure>> {
  const result = await searchMovies(query, options);
  if (!result.success) return err(toSearchFailure(result.error));

  const { page, results, totalPages, totalResults } = result.data;
  return ok({
    hits: results.map((movie) => ({
      id: movie.id,
      posterPath: movie.posterPath,
      title: movie.title,
      year: movie.releaseYear,
    })),
    page,
    totalPages,
    totalResults,
  });
}

export async function searchPersonHits(
  query: string,
  options: { page?: number; signal?: AbortSignal } = {},
): Promise<Result<PersonSearchResponse, SearchFailure>> {
  const result = await searchPeople(query, options);
  if (!result.success) return err(toSearchFailure(result.error));

  const { page, results, totalPages, totalResults } = result.data;
  return ok({
    hits: results.map((person) => ({
      department: person.knownForDepartment,
      id: person.id,
      name: person.name,
      profilePath: person.profilePath,
    })),
    page,
    totalPages,
    totalResults,
  });
}
