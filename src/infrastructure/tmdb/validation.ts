import { tmdbErrors, type TmdbError } from "./errors";
import { TMDB_SEARCH_LIMITS } from "./constants";

const LANGUAGE_TAG = /^[a-z]{2}(?:-[A-Z]{2})?$/;

function normalizeSearchQuery(query: unknown): string {
  return typeof query === "string" ? query.trim().replace(/\s+/g, " ") : "";
}

export function checkLanguage(language: string): TmdbError | null {
  return LANGUAGE_TAG.test(language)
    ? null
    : tmdbErrors.invalidRequest(`Unsupported language "${language}"`);
}

export function checkSearchInput(
  query: string,
  page: number,
  language: string,
): { query: string } | { error: TmdbError } {
  const normalized = normalizeSearchQuery(query);
  if (
    normalized.length === 0 ||
    normalized.length > TMDB_SEARCH_LIMITS.maxQueryLength
  ) {
    return {
      error: tmdbErrors.invalidRequest(
        `Search query must be 1-${TMDB_SEARCH_LIMITS.maxQueryLength} characters`,
      ),
    };
  }
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    page > TMDB_SEARCH_LIMITS.maxPage
  ) {
    return {
      error: tmdbErrors.invalidRequest(
        `Page must be an integer from 1 to ${TMDB_SEARCH_LIMITS.maxPage}`,
      ),
    };
  }
  const languageError = checkLanguage(language);
  if (languageError) return { error: languageError };

  return { query: normalized };
}
