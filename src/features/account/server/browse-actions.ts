"use server";

import "server-only";
import { fail, mutate, ok } from "@/features/auth/server";
import { isTmdbId } from "@/infrastructure/tmdb/validation";
import {
  FAVORITES_MAX,
  LIST_DESCRIPTION_MAX,
  type ActionResult,
  type ListInput,
} from "../lib/browse-data";
import { LIST_TITLE_MAX } from "../lib/lists";
import { isUuid } from "@/infrastructure/uuid";

export async function setFavoriteAction(
  tmdbId: number,
  pinned: boolean,
): Promise<ActionResult> {
  if (!isTmdbId(tmdbId)) return fail("Invalid movie");

  return mutate(
    {
      fallback: "Could not update your favorites",
      name: "Favorite write",
      perMinute: 120,
      scope: "account-change",
    },
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
  if (!isUuid(id)) return fail("Invalid request");
  return mutate(
    {
      fallback: "Could not remove this entry",
      name: "Diary delete",
      perMinute: 120,
      scope: "account-change",
    },
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
  if (!isUuid(listId)) return fail("Invalid request");
  return mutate(
    {
      fallback: "Could not update your like",
      name: "List like",
      perMinute: 120,
      scope: "account-change",
    },
    async ({ client, userId }) => {
      const { data: list, error: listError } = await client
        .from("lists")
        .select("account_id")
        .eq("id", listId)
        .maybeSingle();
      if (listError) throw listError;
      if (!list) return fail("This list is no longer available");
      if (list.account_id === userId) {
        return fail("You can't like your own list");
      }

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
  if (!list || (id !== null && !isUuid(id))) {
    return fail("Give the list a name of up to 120 characters");
  }

  return mutate<{ slug: string }>(
    {
      fallback: "Could not save your list",
      name: "List save",
      perMinute: 120,
      scope: "account-change",
    },
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
  if (!isUuid(listId)) return fail("Invalid request");
  return mutate(
    {
      fallback: "Could not delete this list",
      name: "List delete",
      perMinute: 120,
      scope: "account-change",
    },
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

export interface ListOrderItem {
  posterPath: string | null;
  title: string;
  tmdbId: number;
  year: string | null;
}

const LIST_ITEMS_MAX = 2000;

export async function getListOrderAction(
  listId: string,
): Promise<ActionResult<{ items: ListOrderItem[] }>> {
  if (!isUuid(listId)) return fail("Invalid request");
  return mutate<{ items: ListOrderItem[] }>(
    {
      fallback: "Could not load this list",
      name: "List order read",
      perMinute: 120,
      scope: "account-change",
    },
    async ({ client, userId }) => {
      const list = await client
        .from("lists")
        .select("id")
        .eq("id", listId)
        .eq("account_id", userId)
        .maybeSingle();
      if (list.error) throw list.error;
      if (!list.data) return fail("That list no longer exists");

      const { data, error } = await client
        .from("list_items")
        .select("tmdb_id, title, poster_path, release_date")
        .eq("list_id", listId)
        .order("position", { ascending: true })
        .limit(LIST_ITEMS_MAX);
      if (error) throw error;
      return ok({
        items: (data ?? []).map((row) => ({
          posterPath: row.poster_path,
          title: row.title,
          tmdbId: row.tmdb_id,
          year: row.release_date ? row.release_date.slice(0, 4) : null,
        })),
      });
    },
  );
}

export async function reorderListAction(
  listId: string,
  tmdbIds: readonly number[],
): Promise<ActionResult> {
  if (
    !isUuid(listId) ||
    !Array.isArray(tmdbIds) ||
    tmdbIds.length === 0 ||
    tmdbIds.length > LIST_ITEMS_MAX ||
    !tmdbIds.every(isTmdbId)
  ) {
    return fail("Invalid request");
  }
  return mutate(
    {
      fallback: "Could not save the new order",
      name: "List reorder",
      perMinute: 120,
      scope: "account-change",
    },
    async ({ client }) => {
      const { error } = await client.rpc("reorder_list_items", {
        p_list_id: listId,
        p_tmdb_ids: [...tmdbIds],
      });
      if (error) {
        if (error.code === "22023") {
          return fail("The list changed while you were arranging it");
        }
        throw error;
      }
      return ok();
    },
  );
}
