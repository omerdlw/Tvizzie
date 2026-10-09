import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/infrastructure/supabase/client";
import type {
  CommunityPicks,
  HomeCommunity,
  HomeList,
  HomeReview,
} from "../lib/types";

const LISTS_SHOWN = 6;
const REVIEWS_SHOWN = 6;
const REVIEW_CANDIDATES = 24;
const FOLLOWING_LIMIT = 100;
const MIN_REVIEW_LENGTH = 40;
const MIN_LIST_ITEMS = 3;
const EXCERPT_LENGTH = 180;

type Client = SupabaseClient<Database>;

function one<T>(value: T | T[] | null | undefined): T | null {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

function excerptOf(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= EXCERPT_LENGTH
    ? flat
    : `${flat.slice(0, EXCERPT_LENGTH).trimEnd()}…`;
}

const LIST_SELECT =
  "id, slug, title, description, items_count, likes_count, reviews_count, updated_at, owner:accounts!lists_account_id_fkey(username, display_name), list_items(poster_path, position)";

async function readLists(
  client: Client,
  accountIds: readonly string[] | null,
): Promise<HomeList[]> {
  let query = client
    .from("lists")
    .select(LIST_SELECT)
    .eq("is_private", false)
    .gte("items_count", MIN_LIST_ITEMS)
    .order("position", { ascending: true, referencedTable: "list_items" })
    .limit(5, { referencedTable: "list_items" });

  query = accountIds
    ? query
        .in("account_id", [...accountIds])
        .order("updated_at", { ascending: false })
    : query
        .order("likes_count", { ascending: false })
        .order("updated_at", { ascending: false });

  const { data, error } = await query.limit(LISTS_SHOWN);
  if (error) throw error;

  return (data ?? []).flatMap((row) => {
    const owner = one(row.owner);
    if (!owner?.username) return [];
    return [
      {
        description: row.description,
        id: row.id,
        itemsCount: row.items_count,
        likesCount: row.likes_count,
        owner: {
          displayName: owner.display_name?.trim() || owner.username,
          username: owner.username,
        },
        previews: (row.list_items ?? []).map((item) => item.poster_path),
        reviewsCount: row.reviews_count,
        slug: row.slug,
        title: row.title,
        updatedAt: row.updated_at,
      },
    ];
  });
}

const REVIEW_SELECT =
  "id, content, likes_count, tmdb_id, title, poster_path, release_date, author:accounts!reviews_account_id_fkey(username, display_name, avatar_url)";

async function readReviews(
  client: Client,
  accountIds: readonly string[] | null,
): Promise<HomeReview[]> {
  let query = client
    .from("reviews")
    .select(REVIEW_SELECT)
    .not("tmdb_id", "is", null)
    .eq("is_spoiler", false);

  query = accountIds
    ? query
        .in("account_id", [...accountIds])
        .order("updated_at", { ascending: false })
    : query
        .order("likes_count", { ascending: false })
        .order("updated_at", { ascending: false });

  const { data, error } = await query.limit(REVIEW_CANDIDATES);
  if (error) throw error;

  return (data ?? [])
    .flatMap((row) => {
      const author = one(row.author);
      if (!author?.username || row.tmdb_id === null) return [];
      if (row.content.trim().length < MIN_REVIEW_LENGTH) return [];
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
          excerpt: excerptOf(row.content),
          id: row.id,
          likesCount: row.likes_count,
          posterPath: row.poster_path,
          title: row.title ?? "Untitled",
          tmdbId: row.tmdb_id,
          year: year !== null && Number.isFinite(year) ? year : null,
        },
      ];
    })
    .slice(0, REVIEWS_SHOWN);
}

async function picks(
  client: Client,
  accountIds: readonly string[] | null,
): Promise<CommunityPicks> {
  const [lists, reviews] = await Promise.all([
    readLists(client, accountIds),
    readReviews(client, accountIds),
  ]);
  return { lists, reviews };
}

export async function readHomeCommunity(
  client: Client,
  viewerId: string | null,
): Promise<HomeCommunity> {
  const followingIds = viewerId ? await readFollowing(client, viewerId) : [];
  const [everyone, following] = await Promise.all([
    picks(client, null),
    followingIds.length > 0 ? picks(client, followingIds) : null,
  ]);

  const hasAny = (value: CommunityPicks | null) =>
    value !== null && (value.lists.length > 0 || value.reviews.length > 0);
  return { everyone, following: hasAny(following) ? following : null };
}

async function readFollowing(
  client: Client,
  viewerId: string,
): Promise<string[]> {
  const { data, error } = await client
    .from("account_follows")
    .select("following_id")
    .eq("follower_id", viewerId)
    .eq("status", "accepted")
    .order("created_at", { ascending: false })
    .limit(FOLLOWING_LIMIT);
  if (error) throw error;
  return (data ?? []).map((row) => row.following_id);
}
