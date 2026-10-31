import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/infrastructure/supabase/client";
import type { MovieReviewFilter, MovieReviewSort } from "../lib/constants";
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
  filter = "all",
  from = 0,
  limit,
  sort,
  tmdbId,
  username,
  viewerId,
}: {
  client: Client;
  filter?: MovieReviewFilter;
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
  if (filter === "written") query = query.neq("content", "");
  else if (filter !== "all") {
    const stars = Number(filter);
    query = query.gte("rating", stars).lt("rating", stars + 1);
  }

  const { count, data, error } = await query
    .order(column as "created_at", { ascending, nullsFirst: false })
    .order("id")
    .range(from, from + limit - 1);
  if (error?.code === "PGRST103") {
    const rows = Number(/only (\d+) rows/.exec(error.details ?? "")?.[1]);
    return { reviews: [], total: Number.isFinite(rows) ? rows : 0 };
  }
  if (error) throw error;

  const rows = (data ?? []) as unknown as Row[];
  const authors = rows.flatMap((row) => (row.author ? [row.author.id] : []));
  // Which reviews the viewer liked, and which authors liked the film itself.
  const [likes, fans] = await Promise.all([
    viewerId && rows.length > 0
      ? client
          .from("review_likes")
          .select("review_id")
          .eq("account_id", viewerId)
          .in(
            "review_id",
            rows.map((row) => row.id),
          )
      : null,
    authors.length > 0
      ? client
          .from("account_likes")
          .select("account_id")
          .eq("tmdb_id", tmdbId)
          .in("account_id", authors)
      : null,
  ]);
  const liked = new Set((likes?.data ?? []).map((like) => like.review_id));
  const lovedBy = new Set((fans?.data ?? []).map((fan) => fan.account_id));

  return {
    reviews: rows.flatMap((row) =>
      row.author
        ? [
            {
              authorLiked: lovedBy.has(row.author.id),
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
  const { data, error } = await client.rpc("get_review_stats", {
    p_tmdb_id: tmdbId,
    p_username: username ? username.toLowerCase() : null,
  });
  if (error) throw error;

  const stats = data?.[0];
  const average = stats?.average ?? null;
  return {
    average: average === null ? null : Number(average),
    rated: Number(stats?.rated ?? 0),
    total: Number(stats?.total ?? 0),
  };
}
