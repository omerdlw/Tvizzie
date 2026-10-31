import "server-only";
import { report } from "@omerdlw/base-framework/utils";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
import type { PopularList } from "../lib/types";

const SHOWN = 3;

interface Row {
  description: string | null;
  id: string;
  items_count: number;
  likes_count: number;
  owner: {
    avatar_url: string | null;
    display_name: string | null;
    username: string | null;
  } | null;
  reviews_count: number;
  slug: string;
  title: string;
}

// The most liked public lists that include the film. RLS hides lists of
// private accounts the viewer does not follow.
export async function getMoviePopularLists(
  tmdbId: number,
): Promise<PopularList[]> {
  try {
    const client = await createServerSupabaseClient();
    const { data, error } = await client
      .from("lists")
      .select(
        "id, slug, title, description, items_count, likes_count, reviews_count, owner:accounts!lists_account_id_fkey!inner(username, display_name, avatar_url), list_items!inner(tmdb_id)",
      )
      .eq("list_items.tmdb_id", tmdbId)
      .eq("is_private", false)
      .order("likes_count", { ascending: false })
      .order("items_count", { ascending: false })
      .limit(SHOWN);
    if (error) throw error;
    const rows = ((data ?? []) as unknown as Row[]).filter(
      (row) => row.owner?.username,
    );
    if (rows.length === 0) return [];

    const previews = new Map<string, (string | null)[]>();
    const { data: items, error: previewError } = await client.rpc(
      "get_list_previews",
      { p_limit: 5, p_list_ids: rows.map((row) => row.id) },
    );
    if (previewError) throw previewError;
    for (const item of items ?? []) {
      const posters = previews.get(item.list_id) ?? [];
      posters.push(item.poster_path);
      previews.set(item.list_id, posters);
    }

    return rows.map((row) => ({
      description: row.description ?? "",
      id: row.id,
      itemsCount: row.items_count,
      likesCount: row.likes_count,
      owner: {
        avatarUrl: row.owner?.avatar_url ?? null,
        displayName: row.owner?.display_name || row.owner?.username || "",
        username: row.owner?.username ?? "",
      },
      previews: previews.get(row.id) ?? [],
      reviewsCount: row.reviews_count,
      slug: row.slug,
      title: row.title,
    }));
  } catch (error) {
    report("Popular lists read", error);
    return [];
  }
}
