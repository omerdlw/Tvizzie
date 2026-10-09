"use server";

import "server-only";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { requireUser } from "@/features/auth/server/server";
import { checkRateLimitAsync } from "@/infrastructure/security/rate-limiter";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
import { isMovieId } from "@/infrastructure/tmdb/movies";
import {
  FAVORITES_MAX,
  LIST_DESCRIPTION_MAX,
  type ActionResult,
  type ListInput,
} from "../lib/browse-data";
import { LIST_TITLE_MAX, isListId } from "../lib/lists";

type Client = Awaited<ReturnType<typeof createServerSupabaseClient>>;

const fail = (error: string): { error: string; success: false } => ({
  error,
  success: false,
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function change<T extends object = object>(
  name: string,
  fallback: string,
  work: (context: {
    client: Client;
    userId: string;
  }) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  try {
    const user = await requireUser();
    const limit = await checkRateLimitAsync(`account-change:${user.id}`, {
      limit: 120,
      windowMs: 60 * 1000,
    });
    if (!limit.success) return fail("Too many requests, slow down a little");

    const client = await createServerSupabaseClient();
    return await work({ client, userId: user.id });
  } catch (error) {
    report(name, error);
    return fail(toUserMessage(error, { fallback }));
  }
}

const ok = <T extends object = object>(extra?: T) =>
  ({ success: true, ...extra }) as ActionResult<T>;

export async function setFavoriteAction(
  tmdbId: number,
  pinned: boolean,
): Promise<ActionResult> {
  if (!isMovieId(tmdbId)) return fail("Invalid movie");

  return change(
    "Favorite write",
    "Could not update your favorites",
    async ({ client, userId }) => {
      if (!pinned) {
        const { error } = await client
          .from("account_favorites")
          .delete()
          .eq("account_id", userId)
          .eq("tmdb_id", tmdbId);
        if (error) throw error;
        return ok();
      }

      const taken = await client
        .from("account_favorites")
        .select("tmdb_id, position")
        .eq("account_id", userId);
      if (taken.error) throw taken.error;

      const rows = taken.data ?? [];
      if (rows.some((row) => row.tmdb_id === tmdbId)) return ok();
      if (rows.length >= FAVORITES_MAX) {
        return fail(`You can pin up to ${FAVORITES_MAX} favorites`);
      }

      const used = new Set(rows.map((row) => row.position));
      const position = [1, 2, 3, 4, 5].find((slot) => !used.has(slot));
      if (!position) return fail("Your favorites are full");

      const { error } = await client
        .from("account_favorites")
        .insert({ account_id: userId, position, tmdb_id: tmdbId });
      if (error) {
        if (error.code === "23503") return fail("Like this movie to pin it");
        throw error;
      }
      return ok();
    },
  );
}

export async function deleteDiaryEntryAction(
  id: string,
): Promise<ActionResult> {
  if (!UUID.test(id)) return fail("Invalid request");
  return change(
    "Diary delete",
    "Could not remove this entry",
    async ({ client, userId }) => {
      const { error } = await client
        .from("account_diary")
        .delete()
        .eq("id", id)
        .eq("account_id", userId);
      if (error) throw error;
      return ok();
    },
  );
}

export async function setListLikeAction(
  listId: string,
  liked: boolean,
): Promise<ActionResult> {
  if (!isListId(listId)) return fail("Invalid request");
  return change(
    "List like",
    "Could not update your like",
    async ({ client, userId }) => {
      const { error } = liked
        ? await client
            .from("list_likes")
            .upsert(
              { account_id: userId, list_id: listId },
              { ignoreDuplicates: true, onConflict: "list_id,account_id" },
            )
        : await client
            .from("list_likes")
            .delete()
            .eq("list_id", listId)
            .eq("account_id", userId);
      if (error) throw error;
      return ok();
    },
  );
}

function cleanList(input: ListInput): ListInput | null {
  const title = typeof input?.title === "string" ? input.title.trim() : "";
  const description =
    typeof input?.description === "string" ? input.description.trim() : "";
  if (!title || title.length > LIST_TITLE_MAX) return null;
  if (description.length > LIST_DESCRIPTION_MAX) return null;
  return {
    description,
    isPrivate: Boolean(input.isPrivate),
    isRanked: Boolean(input.isRanked),
    title,
  };
}

export async function saveListAction(
  id: string | null,
  input: ListInput,
): Promise<ActionResult<{ slug: string }>> {
  const list = cleanList(input);
  if (!list || (id !== null && !isListId(id))) {
    return fail("Give the list a name of up to 120 characters");
  }

  return change<{ slug: string }>(
    "List save",
    "Could not save your list",
    async ({ client, userId }) => {
      const row = {
        description: list.description,
        is_private: list.isPrivate,
        is_ranked: list.isRanked,
        title: list.title,
      };

      const result = id
        ? await client
            .from("lists")
            .update(row)
            .eq("id", id)
            .eq("account_id", userId)
            .select("slug")
            .single()
        : await client
            .from("lists")
            .insert({ ...row, account_id: userId })
            .select("slug")
            .single();
      if (result.error) throw result.error;
      return ok({ slug: result.data.slug });
    },
  );
}

export async function deleteListAction(listId: string): Promise<ActionResult> {
  if (!isListId(listId)) return fail("Invalid request");
  return change(
    "List delete",
    "Could not delete this list",
    async ({ client, userId }) => {
      const { error } = await client
        .from("lists")
        .delete()
        .eq("id", listId)
        .eq("account_id", userId);
      if (error) throw error;
      return ok();
    },
  );
}
