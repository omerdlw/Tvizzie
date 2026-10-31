import "server-only";
import { report } from "@omerdlw/base-framework/utils";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
import type { FilmStats } from "../lib/types";

// A missing row means nobody has touched the film yet; a failed read only
// hides the row, it never takes the page down.
export async function getFilmStats(tmdbId: number): Promise<FilmStats | null> {
  try {
    const client = await createServerSupabaseClient();
    const { data, error } = await client
      .from("film_stats")
      .select(
        "watched_count, liked_count, listed_count, watchlist_count, reviews_count, ratings",
      )
      .eq("tmdb_id", tmdbId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      liked: data.liked_count,
      listed: data.listed_count,
      ratings: data.ratings,
      reviews: data.reviews_count,
      watched: data.watched_count,
      watchlist: data.watchlist_count,
    };
  } catch (error) {
    report("Film stats read", error);
    return null;
  }
}
