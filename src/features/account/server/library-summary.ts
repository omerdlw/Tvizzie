import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/infrastructure/supabase/client";
import {
  EMPTY_LIBRARY_COUNTS,
  releaseYear,
  type Favorite,
  type LibraryCounts,
} from "../lib/library-view";

interface FavoriteRow {
  account_likes: {
    poster_path: string | null;
    release_date: string | null;
    title: string;
  } | null;
  position: number;
  tmdb_id: number;
}

export async function getAccountLibrarySummary({
  accountId,
  client,
}: {
  accountId: string;
  client: SupabaseClient<Database>;
}): Promise<{ counts: LibraryCounts; favorites: Favorite[] }> {
  const [stats, favorites] = await Promise.all([
    client
      .from("account_stats")
      .select(
        "diary_count, watched_count, watchlist_count, likes_count, lists_count, reviews_count",
      )
      .eq("account_id", accountId)
      .maybeSingle(),
    client
      .from("account_favorites")
      .select(
        "tmdb_id, position, account_likes(title, poster_path, release_date)",
      )
      .eq("account_id", accountId)
      .order("position", { ascending: true })
      .limit(5),
  ]);

  const counts: LibraryCounts = stats.data
    ? {
        diary: stats.data.diary_count,
        likes: stats.data.likes_count,
        lists: stats.data.lists_count,
        reviews: stats.data.reviews_count,
        watched: stats.data.watched_count,
        watchlist: stats.data.watchlist_count,
      }
    : EMPTY_LIBRARY_COUNTS;

  const pinned: Favorite[] = [];
  for (const row of (favorites.data ?? []) as unknown as FavoriteRow[]) {
    if (!row.account_likes) continue;
    pinned.push({
      posterPath: row.account_likes.poster_path,
      title: row.account_likes.title,
      tmdbId: row.tmdb_id,
      year: releaseYear(row.account_likes.release_date),
    });
  }

  return { counts, favorites: pinned };
}
