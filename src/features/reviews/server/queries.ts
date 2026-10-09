import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/infrastructure/supabase/client";
import type { MovieReviewSort } from "../lib/constants";
import type { MovieReview, ReviewStats } from "../lib/types";

type Client = SupabaseClient<Database>;

interface Row {
  author: {
    avatar_url: string | null;
    display_name: string | null;
    id: string;
    username: string;
  } | null;
  content: string;
  created_at: string;
  id: string;
  is_spoiler: boolean;
  likes_count: number;
  rating: number | null;
  updated_at: string;
}

const COLUMNS =
  "id, content, rating, is_spoiler, likes_count, created_at, updated_at, author:accounts!reviews_account_id_fkey!inner(id, username, display_name, avatar_url)";

const STATS_SAMPLE = 5000;

const ORDER: Record<MovieReviewSort, [string, boolean]> = {
  likes_asc: ["likes_count", true],
  likes_desc: ["likes_count", false],
  newest: ["updated_at", false],
  oldest: ["updated_at", true],
  rating_asc: ["rating", true],
  rating_desc: ["rating", false],
};

export async function getMovieReviews({
  client,
  from = 0,
  limit,
  sort,
  tmdbId,
  username,
  viewerId,
}: {
  client: Client;
  from?: number;
  limit: number;
  sort: MovieReviewSort;
  tmdbId: number;
  username?: string | null;
  viewerId: string | null;
}): Promise<{ reviews: MovieReview[]; total: number }> {
  const [column, ascending] = ORDER[sort];

  let query = client
    .from("reviews")
    .select(COLUMNS, { count: "exact" })
    .eq("tmdb_id", tmdbId);
  if (username) query = query.eq("author.username", username.toLowerCase());

  const { count, data, error } = await query
    .order(column as "created_at", { ascending, nullsFirst: false })
    .order("id")
    .range(from, from + limit - 1);
  if (error) throw error;

  const rows = (data ?? []) as unknown as Row[];
  let liked = new Set<string>();
  if (viewerId && rows.length > 0) {
    const likes = await client
      .from("review_likes")
      .select("review_id")
      .eq("account_id", viewerId)
      .in(
        "review_id",
        rows.map((row) => row.id),
      );
    liked = new Set((likes.data ?? []).map((like) => like.review_id));
  }

  return {
    reviews: rows.flatMap((row) =>
      row.author
        ? [
            {
              author: {
                avatarUrl: row.author.avatar_url,
                displayName: row.author.display_name || row.author.username,
                id: row.author.id,
                username: row.author.username,
              },
              content: row.content,
              createdAt: row.created_at,
              id: row.id,
              isSpoiler: row.is_spoiler,
              liked: liked.has(row.id),
              likesCount: row.likes_count,
              rating: row.rating === null ? null : Number(row.rating),
              updatedAt: row.updated_at,
            },
          ]
        : [],
    ),
    total: count ?? 0,
  };
}

export async function getReviewStats({
  client,
  tmdbId,
  username,
}: {
  client: Client;
  tmdbId: number;
  username?: string | null;
}): Promise<ReviewStats> {
  let query = client
    .from("reviews")
    .select("rating, author:accounts!reviews_account_id_fkey!inner(username)", {
      count: "exact",
    })
    .eq("tmdb_id", tmdbId);
  if (username) query = query.eq("author.username", username.toLowerCase());

  const { count, data, error } = await query.limit(STATS_SAMPLE);
  if (error) throw error;

  const ratings = ((data ?? []) as unknown as { rating: number | null }[])
    .map((row) => (row.rating === null ? null : Number(row.rating)))
    .filter((rating): rating is number => rating !== null);
  const sum = ratings.reduce((total, rating) => total + rating, 0);

  return {
    average: ratings.length
      ? Math.round((sum / ratings.length) * 10) / 10
      : null,
    rated: ratings.length,
    total: count ?? 0,
  };
}
