import "server-only";

import { err, ok, type Result } from "@omerdlw/base-framework/result";
import { report } from "@omerdlw/base-framework/utils";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
import { SEARCH_COMMUNITY_LIMIT } from "../lib/constants";
import type {
  ListSearchResponse,
  ReviewSearchResponse,
  SearchFailure,
  SearchResponse,
  UserSearchResponse,
} from "../lib/types";
import { MATCH, RENOWN, bestMatch, fold, renown, textMatch } from "../lib/rank";
import { excerpt, isSearchable, normalizeQuery } from "../lib/utils";

const INVALID: SearchFailure = {
  code: "invalid_query",
  message: "Enter a valid search term",
};
const UNAVAILABLE: SearchFailure = {
  code: "unavailable",
  message: "Search is unavailable right now. Please try again in a moment",
};

// The database puts prefix matches first, so twice the shown count leaves the
// ranking below room to reorder what it was given.
const CANDIDATES = SEARCH_COMMUNITY_LIMIT * 2;

function prepare(query: string, { handle = false } = {}): string | null {
  const normalized = normalizeQuery(handle ? query.replace(/^@+/, "") : query);
  if (!isSearchable(normalized)) return null;

  const text = normalized
    .replace(/[\\%_,()*"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length < 2 ? null : text;
}

function answer<Hit>(hits: Hit[]): SearchResponse<Hit> {
  return { hits, page: 1, totalPages: 1, totalResults: hits.length };
}

function fail(name: string, error: unknown): Result<never, SearchFailure> {
  report(name, error);
  return err(UNAVAILABLE);
}

// Community search goes through search_* functions rather than the tables:
// under row level security ILIKE may not run before the policy, so the
// trigram indexes went unused and every row was filtered one by one. The
// functions apply the same visibility rules as the policies.
export async function searchUserHits(
  query: string,
  options: { page?: number; signal?: AbortSignal } = {},
): Promise<Result<UserSearchResponse, SearchFailure>> {
  void options;
  const text = prepare(query, { handle: true });
  if (!text) return err(INVALID);

  try {
    const client = await createServerSupabaseClient();
    const { data, error } = await client.rpc("search_accounts", {
      p_limit: CANDIDATES,
      p_query: text,
    });
    if (error) throw error;

    const hits = (data ?? [])
      .flatMap((row) => {
        if (!row.username) return [];
        const followersCount = row.followers_count ?? 0;
        const match = bestMatch([row.username, row.display_name], text);
        return [
          {
            avatarUrl: row.avatar_url,
            displayName: row.display_name?.trim() || row.username,
            followersCount,
            id: row.id,
            isPrivate: row.is_private,
            match,
            score:
              match + renown({ popularity: followersCount }, RENOWN.follows),
            username: row.username,
          },
        ];
      })
      .sort((a, b) => b.match - a.match || b.followersCount - a.followersCount)
      .slice(0, SEARCH_COMMUNITY_LIMIT);

    return ok(answer(hits));
  } catch (error) {
    return fail("Search users", error);
  }
}

export async function searchListHits(
  query: string,
  options: { page?: number; signal?: AbortSignal } = {},
): Promise<Result<ListSearchResponse, SearchFailure>> {
  void options;
  const text = prepare(query);
  if (!text) return err(INVALID);

  try {
    const client = await createServerSupabaseClient();
    const { data, error } = await client.rpc("search_lists", {
      p_limit: CANDIDATES,
      p_query: text,
    });
    if (error) throw error;

    const hits = (data ?? [])
      .flatMap((row) => {
        const match = textMatch(row.title, text);
        return row.owner_username
          ? [
              {
                id: row.id,
                itemsCount: row.items_count,
                likesCount: row.likes_count,
                match,
                owner: {
                  displayName:
                    row.owner_display_name?.trim() || row.owner_username,
                  username: row.owner_username,
                },
                posterPath: row.poster_path,
                score:
                  match + renown({ popularity: row.likes_count }, RENOWN.likes),
                slug: row.slug,
                title: row.title,
              },
            ]
          : [];
      })
      .sort((a, b) => b.match - a.match || b.likesCount - a.likesCount)
      .slice(0, SEARCH_COMMUNITY_LIMIT);

    return ok(answer(hits));
  } catch (error) {
    return fail("Search lists", error);
  }
}

export async function searchReviewHits(
  query: string,
  options: { page?: number; signal?: AbortSignal } = {},
): Promise<Result<ReviewSearchResponse, SearchFailure>> {
  void options;
  const text = prepare(query);
  if (!text) return err(INVALID);

  try {
    const client = await createServerSupabaseClient();
    // A review is found by the film it is about as well as by its words:
    // "la la land" brings the reviews of La La Land, then the ones that
    // mention it.
    const { data, error } = await client.rpc("search_reviews", {
      p_limit: CANDIDATES,
      p_query: text,
    });
    if (error) throw error;

    const said = fold(text);
    const hits = (data ?? []).flatMap((row) => {
      if (!row.author_username) return [];
      const year = row.release_date
        ? Number(row.release_date.slice(0, 4))
        : null;
      const match = Math.max(
        textMatch(row.title, text),
        fold(row.content).includes(said) ? MATCH.substring : 0,
      );
      return [
        {
          author: {
            avatarUrl: row.author_avatar_url,
            displayName: row.author_display_name?.trim() || row.author_username,
            username: row.author_username,
          },
          excerpt: row.is_spoiler ? "" : excerpt(row.content, text),
          id: row.id,
          isSpoiler: row.is_spoiler,
          likesCount: row.likes_count,
          match,
          posterPath: row.poster_path,
          rating: row.rating === null ? null : Number(row.rating),
          score: match + renown({ popularity: row.likes_count }, RENOWN.likes),
          title: row.title ?? "Untitled",
          tmdbId: row.tmdb_id,
          year: year !== null && Number.isFinite(year) ? year : null,
        },
      ];
    });
    hits.sort((a, b) => b.match - a.match || b.likesCount - a.likesCount);

    return ok(answer(hits.slice(0, SEARCH_COMMUNITY_LIMIT)));
  } catch (error) {
    return fail("Search reviews", error);
  }
}
