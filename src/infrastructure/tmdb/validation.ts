import { tmdbErrors, type TmdbError } from "./errors";
import { TMDB_SEARCH_LIMITS } from "./constants";

const LANGUAGE_TAG = /^[a-z]{2}(?:-[A-Z]{2})?$/;

export function isTmdbId(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

function normalizeSearchQuery(query: unknown): string {
  return typeof query === "string" ? query.trim().replace(/\s+/g, " ") : "";
}

export function checkLanguage(language: string): TmdbError | null {
  return LANGUAGE_TAG.test(language)
    ? null
    : tmdbErrors.invalidRequest(`Unsupported language "${language}"`);
}

export function checkPage(page: number): TmdbError | null {
  return Number.isInteger(page) &&
    page >= 1 &&
    page <= TMDB_SEARCH_LIMITS.maxPage
    ? null
    : tmdbErrors.invalidRequest(
        `Page must be an integer from 1 to ${TMDB_SEARCH_LIMITS.maxPage}`,
      );
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
  const invalid = checkPage(page) ?? checkLanguage(language);
  if (invalid) return { error: invalid };

  return { query: normalized };
}
