import { err, type Result } from "@omerdlw/base-framework/result";
import {
  TMDB_CACHE_TAG,
  TMDB_DEFAULT_LANGUAGE,
  TMDB_REVALIDATE,
} from "./constants";
import { tmdbErrors, type TmdbError } from "./errors";
import { personDetailsSchema } from "./schemas/person";
import { personSearchPageSchema } from "./schemas/search";
import type { TmdbTransport } from "./transport";
import type { PersonDetails, PersonSearchPage } from "./types";
import { checkLanguage, checkSearchInput } from "./validation";

export interface PersonDetailsOptions {
  language?: string;
  signal?: AbortSignal;
}

export interface PersonSearchOptions extends PersonDetailsOptions {
  page?: number;
}

const APPENDED_RESOURCES = ["movie_credits", "images", "external_ids"].join(
  ",",
);

function personCacheTag(id: number): string {
  return `${TMDB_CACHE_TAG}:person:${id}`;
}

export function isPersonId(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

export interface PeopleApi {
  getDetails(
    id: number,
    options?: PersonDetailsOptions,
  ): Promise<Result<PersonDetails, TmdbError>>;
  search(
    query: string,
    options?: PersonSearchOptions,
  ): Promise<Result<PersonSearchPage, TmdbError>>;
}

export function createPeopleApi(transport: TmdbTransport): PeopleApi {
  return {
    async getDetails(id, { language = TMDB_DEFAULT_LANGUAGE, signal } = {}) {
      if (!isPersonId(id)) {
        return err(
          tmdbErrors.invalidRequest("Person id must be a positive integer"),
        );
      }
      const languageError = checkLanguage(language);
      if (languageError) return err(languageError);

      return transport.request({
        path: `/person/${id}`,
        query: { language, append_to_response: APPENDED_RESOURCES },
        schema: personDetailsSchema,
        revalidate: TMDB_REVALIDATE.person,
        tags: [personCacheTag(id)],
        signal,
      });
    },

    async search(
      query,
      { language = TMDB_DEFAULT_LANGUAGE, page = 1, signal } = {},
    ) {
      const checked = checkSearchInput(query, page, language);
      if ("error" in checked) return err(checked.error);

      return transport.request({
        path: "/search/person",
        query: {
          query: checked.query,
          language,
          page,
          include_adult: false,
        },
        schema: personSearchPageSchema,
        revalidate: TMDB_REVALIDATE.search,
        signal,
      });
    },
  };
}
