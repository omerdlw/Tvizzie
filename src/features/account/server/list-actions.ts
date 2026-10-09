"use server";

import "server-only";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { requireUser } from "@/features/auth/server/server";
import { checkRateLimitAsync } from "@/infrastructure/security/rate-limiter";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
import { isMovieId } from "@/infrastructure/tmdb/movies";
import { getMovieDetails } from "@/infrastructure/tmdb/server";
import type { MovieDetails } from "@/infrastructure/tmdb/types";
import {
  LIST_TITLE_MAX,
  isListId,
  type MovieListChangeResult,
  type MovieListSummary,
  type MovieListsResult,
} from "../lib/lists";
import { movieSnapshot } from "@/infrastructure/tmdb/snapshot";

type Client = Awaited<ReturnType<typeof createServerSupabaseClient>>;

const LIST_COLUMNS =
  "id, title, description, is_private, items_count, poster_path";
const MAX_LISTS = 200;

interface ListRow {
  description: string | null;
  id: string;
  is_private: boolean;
  items_count: number;
  poster_path: string | null;
  title: string;
}

const summarize = (
  row: ListRow,
  previewPosters?: (string | null)[],
): MovieListSummary => ({
  description: row.description,
  id: row.id,
  isPrivate: row.is_private,
  itemsCount: row.items_count,
  posterPath: row.poster_path,
  previewPosters: previewPosters ?? (row.poster_path ? [row.poster_path] : []),
  title: row.title,
});

const fail = (error: string) => ({ error, success: false }) as const;

function messageFor(error: unknown, fallback: string) {
  if ((error as { code?: string } | null)?.code === "54000") {
    return "That list is full";
  }
  return toUserMessage(error, { fallback });
}

async function limited(userId: string) {
  const limit = await checkRateLimitAsync(`lists:${userId}`, {
    limit: 60,
    windowMs: 60 * 1000,
  });
  return limit.success;
}

async function loadMovie(tmdbId: number): Promise<MovieDetails | null> {
  const result = await getMovieDetails(tmdbId);
  return result.success ? result.data : null;
}

async function addItem(
  client: Client,
  listId: string,
  tmdbId: number,
  movie: MovieDetails,
) {
  return client
    .from("list_items")
    .upsert(
      { list_id: listId, tmdb_id: tmdbId, ...movieSnapshot(movie) },
      { ignoreDuplicates: true, onConflict: "list_id,tmdb_id" },
    );
}

async function readList(client: Client, listId: string, accountId: string) {
  const { data, error } = await client
    .from("lists")
    .select(LIST_COLUMNS)
    .eq("id", listId)
    .eq("account_id", accountId)
    .maybeSingle();
  if (error) throw error;
  return data as ListRow | null;
}

export async function getMovieListsAction(
  tmdbId: number,
): Promise<MovieListsResult> {
  try {
    if (!isMovieId(tmdbId)) return fail("Invalid movie");

    const user = await requireUser();
    const client = await createServerSupabaseClient();

    const lists = await client
      .from("lists")
      .select(LIST_COLUMNS)
      .eq("account_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(MAX_LISTS);
    if (lists.error) throw lists.error;

    const rows = (lists.data ?? []) as ListRow[];
    let memberships: string[] = [];
    if (rows.length > 0) {
      const items = await client
        .from("list_items")
        .select("list_id")
        .eq("tmdb_id", tmdbId)
        .in(
          "list_id",
          rows.map((row) => row.id),
        );
      if (items.error) throw items.error;
      memberships = (items.data ?? []).map(
        (item: { list_id: string }) => item.list_id,
      );
    }

    const previews = await Promise.all(
      rows.map(async (row) => {
        if (row.items_count === 0) return [];
        const { data } = await client
          .from("list_items")
          .select("poster_path")
          .eq("list_id", row.id)
          .order("position", { ascending: true })
          .limit(4);
        return (data ?? []).map((item) => item.poster_path).filter(Boolean);
      }),
    );

    return {
      lists: rows.map((row, index) => summarize(row, previews[index])),
      memberships,
      success: true,
    };
  } catch (error) {
    report("MovieLists read", error);
    return fail(
      toUserMessage(error, { fallback: "Could not load your lists" }),
    );
  }
}

async function getListPreviews(client: Client, listId: string) {
  const { data } = await client
    .from("list_items")
    .select("poster_path")
    .eq("list_id", listId)
    .order("position", { ascending: true })
    .limit(4);
  return (data ?? []).map((item) => item.poster_path).filter(Boolean);
}

export async function setMovieListMembershipAction(
  tmdbId: number,
  listId: string,
  active: boolean,
): Promise<MovieListChangeResult> {
  try {
    if (!isMovieId(tmdbId) || !isListId(listId)) return fail("Invalid request");

    const user = await requireUser();
    if (!(await limited(user.id))) {
      return fail("Too many requests, slow down a little");
    }

    const client = await createServerSupabaseClient();
    if (!(await readList(client, listId, user.id))) {
      return fail("That list no longer exists");
    }

    if (active) {
      const movie = await loadMovie(tmdbId);
      if (!movie) return fail("Could not load this movie, try again");
      const { error } = await addItem(client, listId, tmdbId, movie);
      if (error) throw error;
    } else {
      const { error } = await client
        .from("list_items")
        .delete()
        .eq("list_id", listId)
        .eq("tmdb_id", tmdbId);
      if (error) throw error;
    }

    const list = await readList(client, listId, user.id);
    if (!list) return fail("That list no longer exists");
    const previews = await getListPreviews(client, listId);
    return { inList: active, list: summarize(list, previews), success: true };
  } catch (error) {
    report("MovieLists write", error);
    return fail(messageFor(error, "Could not update your list"));
  }
}

export async function createMovieListAction(
  tmdbId: number,
  title: string,
  isPrivate: boolean,
): Promise<MovieListChangeResult> {
  try {
    const cleaned = typeof title === "string" ? title.trim() : "";
    if (!isMovieId(tmdbId) || !cleaned || cleaned.length > LIST_TITLE_MAX) {
      return fail("Give the list a name of up to 120 characters");
    }

    const user = await requireUser();
    if (!(await limited(user.id))) {
      return fail("Too many requests, slow down a little");
    }

    const movie = await loadMovie(tmdbId);
    if (!movie) return fail("Could not load this movie, try again");

    const client = await createServerSupabaseClient();
    const created = await client
      .from("lists")
      .insert({
        account_id: user.id,
        is_private: Boolean(isPrivate),
        title: cleaned,
      })
      .select(LIST_COLUMNS)
      .single();
    if (created.error) throw created.error;

    const listId = (created.data as ListRow).id;
    const { error } = await addItem(client, listId, tmdbId, movie);
    if (error) throw error;

    const list = await readList(client, listId, user.id);
    const previews = await getListPreviews(client, listId);
    return {
      inList: true,
      list: summarize(list ?? (created.data as ListRow), previews),
      success: true,
    };
  } catch (error) {
    report("MovieLists create", error);
    return fail(messageFor(error, "Could not create your list"));
  }
}
