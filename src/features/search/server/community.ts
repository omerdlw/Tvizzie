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
import { excerpt, isSearchable, matchRank, normalizeQuery } from "../lib/utils";

const INVALID: SearchFailure = {
  code: "invalid_query",
  message: "Enter a valid search term",
};
const UNAVAILABLE: SearchFailure = {
  code: "unavailable",
  message: "Search is unavailable right now. Please try again in a moment",
};

const CANDIDATES = SEARCH_COMMUNITY_LIMIT * 2;

type Client = Awaited<ReturnType<typeof createServerSupabaseClient>>;

interface Prepared {
  contains: string;
  prefix: string;
  text: string;
}

function prepare(query: string, { handle = false } = {}): Prepared | null {
  const normalized = normalizeQuery(handle ? query.replace(/^@+/, "") : query);
  if (!isSearchable(normalized)) return null;

  const text = normalized
    .replace(/[\\%_,()*"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length < 2) return null;

  return { contains: `%${text}%`, prefix: `${text}%`, text };
}

function answer<Hit>(hits: Hit[]): SearchResponse<Hit> {
  return { hits, page: 1, totalPages: 1, totalResults: hits.length };
}

function merge<Row extends { id: string }>(
  ...groups: readonly (readonly Row[] | null)[]
): Row[] {
  const seen = new Map<string, Row>();
  for (const group of groups) {
    for (const row of group ?? []) if (!seen.has(row.id)) seen.set(row.id, row);
  }
  return [...seen.values()];
}

function fail(name: string, error: unknown): Result<never, SearchFailure> {
  report(name, error);
  return err(UNAVAILABLE);
}

function one<T>(value: T | T[] | null | undefined): T | null {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

const USER_SELECT =
  "id, username, display_name, avatar_url, is_private, account_stats(followers_count)";

export async function searchUserHits(
  query: string,
  options: { page?: number; signal?: AbortSignal } = {},
): Promise<Result<UserSearchResponse, SearchFailure>> {
  void options;
  const wanted = prepare(query, { handle: true });
  if (!wanted) return err(INVALID);

  try {
    const client: Client = await createServerSupabaseClient();
    const read = (pattern: string, limit: number) =>
      client
        .from("accounts")
        .select(USER_SELECT)
        .eq("is_active", true)
        .not("username", "is", null)
        .or(`username.ilike.${pattern},display_name.ilike.${pattern}`)
        .limit(limit);

    const [prefix, contains] = await Promise.all([
      read(wanted.prefix, SEARCH_COMMUNITY_LIMIT),
      read(wanted.contains, CANDIDATES),
    ]);
    if (prefix.error) throw prefix.error;
    if (contains.error) throw contains.error;

    const hits = merge(prefix.data, contains.data)
      .flatMap((row) =>
        row.username
          ? [
              {
                avatarUrl: row.avatar_url,
                displayName: row.display_name?.trim() || row.username,
                followersCount: one(row.account_stats)?.followers_count ?? 0,
                id: row.id,
                isPrivate: row.is_private,
                rank: Math.min(
                  matchRank(row.username, wanted.text),
                  matchRank(row.display_name, wanted.text),
                ),
                username: row.username,
              },
            ]
          : [],
      )
      .sort((a, b) => a.rank - b.rank || b.followersCount - a.followersCount)
      .slice(0, SEARCH_COMMUNITY_LIMIT)
      .map(({ rank, ...hit }) => {
        void rank;
        return hit;
      });

    return ok(answer(hits));
  } catch (error) {
    return fail("Search users", error);
  }
}

const LIST_SELECT =
  "id, slug, title, poster_path, items_count, likes_count, owner:accounts!lists_account_id_fkey(username, display_name)";

export async function searchListHits(
  query: string,
  options: { page?: number; signal?: AbortSignal } = {},
): Promise<Result<ListSearchResponse, SearchFailure>> {
  void options;
  const wanted = prepare(query);
  if (!wanted) return err(INVALID);

  try {
    const client: Client = await createServerSupabaseClient();
    const read = (pattern: string, limit: number) =>
      client
        .from("lists")
        .select(LIST_SELECT)
        .ilike("title", pattern)
        .order("likes_count", { ascending: false })
        .limit(limit);

    const [prefix, contains] = await Promise.all([
      read(wanted.prefix, SEARCH_COMMUNITY_LIMIT),
      read(wanted.contains, CANDIDATES),
    ]);
    if (prefix.error) throw prefix.error;
    if (contains.error) throw contains.error;

    const hits = merge(prefix.data, contains.data)
      .flatMap((row) => {
        const owner = one(row.owner);
        return owner?.username
          ? [
              {
                id: row.id,
                itemsCount: row.items_count,
                likesCount: row.likes_count,
                owner: {
                  displayName: owner.display_name?.trim() || owner.username,
                  username: owner.username,
                },
                posterPath: row.poster_path,
                rank: matchRank(row.title, wanted.text),
                slug: row.slug,
                title: row.title,
              },
            ]
          : [];
      })
      .sort((a, b) => a.rank - b.rank || b.likesCount - a.likesCount)
      .slice(0, SEARCH_COMMUNITY_LIMIT)
      .map(({ rank, ...hit }) => {
        void rank;
        return hit;
      });

    return ok(answer(hits));
  } catch (error) {
    return fail("Search lists", error);
  }
}

const REVIEW_SELECT =
  "id, content, is_spoiler, rating, likes_count, tmdb_id, title, poster_path, release_date, author:accounts!reviews_account_id_fkey(username, display_name, avatar_url)";

export async function searchReviewHits(
  query: string,
  options: { page?: number; signal?: AbortSignal } = {},
): Promise<Result<ReviewSearchResponse, SearchFailure>> {
  void options;
  const wanted = prepare(query);
  if (!wanted) return err(INVALID);

  try {
    const client: Client = await createServerSupabaseClient();
    const { data, error } = await client
      .from("reviews")
      .select(REVIEW_SELECT)
      .not("tmdb_id", "is", null)
      .ilike("content", wanted.contains)
      .order("likes_count", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(SEARCH_COMMUNITY_LIMIT);
    if (error) throw error;

    const hits = (data ?? []).flatMap((row) => {
      const author = one(row.author);
      if (!author?.username || row.tmdb_id === null) return [];
      const year = row.release_date
        ? Number(row.release_date.slice(0, 4))
        : null;
      return [
        {
          author: {
            avatarUrl: author.avatar_url,
            displayName: author.display_name?.trim() || author.username,
            username: author.username,
          },
          excerpt: row.is_spoiler ? "" : excerpt(row.content, wanted.text),
          id: row.id,
          isSpoiler: row.is_spoiler,
          likesCount: row.likes_count,
          posterPath: row.poster_path,
          rating: row.rating === null ? null : Number(row.rating),
          title: row.title ?? "Untitled",
          tmdbId: row.tmdb_id,
          year: year !== null && Number.isFinite(year) ? year : null,
        },
      ];
    });

    return ok(answer(hits));
  } catch (error) {
    return fail("Search reviews", error);
  }
}
