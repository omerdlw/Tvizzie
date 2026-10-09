import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/infrastructure/supabase/client";
import {
  ACTIVITY_PAGE_SIZE,
  ACTIVITY_TYPES,
  LIST_PAGE_SIZE,
  MEDIA_PAGE_SIZE,
  REVIEW_PAGE_SIZE,
  likePattern,
  monthBounds,
  pageCount,
  pageRange,
  type ActivityFilters,
  type ListItemFilters,
  type ListSort,
  type MediaFilters,
  type ReviewFilters,
} from "../lib/browse";
import type {
  ActivityItem,
  DiaryMonth,
  ListCardData,
  ListComment,
  ListDetail,
  MediaItem,
  Paged,
  ReviewCardData,
} from "../lib/browse-data";
import { releaseYear } from "../lib/library-view";

type Client = SupabaseClient<Database>;

const paged = <T>(
  items: T[],
  total: number | null,
  page: number,
  size: number,
): Paged<T> => ({
  items,
  page,
  pageCount: pageCount(total ?? 0, size),
  total: total ?? 0,
});

export type MediaKind = "likes" | "watched" | "watchlist";

const MEDIA_TABLES = {
  likes: "account_likes",
  watched: "account_watched",
  watchlist: "account_watchlist",
} as const;

interface Filterable<T> {
  contains(column: string, value: unknown): T;
  gte(column: string, value: string): T;
  ilike(column: string, pattern: string): T;
  lt(column: string, value: string): T;
}

function filterMovies<T extends Filterable<T>>(
  query: T,
  filters: Pick<MediaFilters, "decade" | "genre" | "query">,
): T {
  let next = query;
  if (filters.query) next = next.ilike("title", likePattern(filters.query));
  if (filters.genre) {
    next = next.contains("payload", { genre_ids: [filters.genre] });
  }
  if (filters.decade) {
    next = next
      .gte("release_date", `${filters.decade}-01-01`)
      .lt("release_date", `${filters.decade + 10}-01-01`);
  }
  return next;
}

interface MovieRow {
  poster_path: string | null;
  release_date: string | null;
  title: string;
  tmdb_id: number;
}

const MOVIE_COLUMNS = "tmdb_id, title, poster_path, release_date";

const toMediaItem = (row: MovieRow, pinned: Set<number>): MediaItem => ({
  pinned: pinned.has(row.tmdb_id),
  posterPath: row.poster_path,
  title: row.title,
  tmdbId: row.tmdb_id,
  year: releaseYear(row.release_date),
});

export async function getMediaPage({
  accountId,
  client,
  filters,
  kind,
}: {
  accountId: string;
  client: Client;
  filters: MediaFilters;
  kind: MediaKind;
}): Promise<Paged<MediaItem>> {
  const { from, to } = pageRange(filters.page, MEDIA_PAGE_SIZE);
  const added = kind === "watched" ? "last_watched_at" : "created_at";

  let query = filterMovies(
    client
      .from(MEDIA_TABLES[kind] as "account_likes")
      .select(MOVIE_COLUMNS, { count: "exact" })
      .eq("account_id", accountId),
    filters,
  );

  const [column, ascending] = {
    added_asc: [added, true],
    added_desc: [added, false],
    release_asc: ["release_date", true],
    release_desc: ["release_date", false],
    title_asc: ["title", true],
    title_desc: ["title", false],
  }[filters.sort] as [string, boolean];

  query = query
    .order(column as "created_at", { ascending, nullsFirst: false })
    .order("tmdb_id", { ascending: false })
    .range(from, to);

  const [result, favorites] = await Promise.all([
    query,
    kind === "likes"
      ? client
          .from("account_favorites")
          .select("tmdb_id")
          .eq("account_id", accountId)
      : null,
  ]);
  if (result.error) throw result.error;

  const pinned = new Set((favorites?.data ?? []).map((row) => row.tmdb_id));
  return paged(
    ((result.data ?? []) as MovieRow[]).map((row) => toMediaItem(row, pinned)),
    result.count,
    filters.page,
    MEDIA_PAGE_SIZE,
  );
}

export async function getRecentMedia({
  accountId,
  client,
  kind,
  limit,
}: {
  accountId: string;
  client: Client;
  kind: MediaKind;
  limit: number;
}): Promise<MediaItem[]> {
  const added = kind === "watched" ? "last_watched_at" : "created_at";
  const { data, error } = await client
    .from(MEDIA_TABLES[kind] as "account_likes")
    .select(MOVIE_COLUMNS)
    .eq("account_id", accountId)
    .order(added as "created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as MovieRow[]).map((row) => toMediaItem(row, new Set()));
}

export async function getListItemsPage({
  client,
  filters,
  listId,
}: {
  client: Client;
  filters: ListItemFilters;
  listId: string;
}): Promise<Paged<MediaItem>> {
  const { from, to } = pageRange(filters.page, MEDIA_PAGE_SIZE);

  let query = filterMovies(
    client
      .from("list_items")
      .select(MOVIE_COLUMNS, { count: "exact" })
      .eq("list_id", listId),
    filters,
  );

  const [column, ascending] = {
    added_asc: ["created_at", true],
    added_desc: ["created_at", false],
    position: ["position", true],
    release_asc: ["release_date", true],
    release_desc: ["release_date", false],
    title_asc: ["title", true],
    title_desc: ["title", false],
  }[filters.sort] as [string, boolean];

  query = query
    .order(column as "created_at", { ascending, nullsFirst: false })
    .order("tmdb_id", { ascending: true })
    .range(from, to);

  const result = await query;
  if (result.error) throw result.error;
  return paged(
    ((result.data ?? []) as MovieRow[]).map((row) =>
      toMediaItem(row, new Set()),
    ),
    result.count,
    filters.page,
    MEDIA_PAGE_SIZE,
  );
}

interface ListRow {
  description: string;
  id: string;
  is_private: boolean;
  is_ranked: boolean;
  items_count: number;
  likes_count: number;
  reviews_count: number;
  slug: string;
  title: string;
  updated_at: string;
}

const LIST_COLUMNS =
  "id, slug, title, description, is_private, is_ranked, items_count, likes_count, reviews_count, updated_at";

async function withPreviews(
  client: Client,
  rows: ListRow[],
): Promise<ListCardData[]> {
  const previews = await Promise.all(
    rows.map(async (row) => {
      const { data } = await client
        .from("list_items")
        .select("poster_path")
        .eq("list_id", row.id)
        .order("position", { ascending: true })
        .limit(5);
      return (data ?? []).map((item) => item.poster_path);
    }),
  );

  return rows.map((row, index) => ({
    description: row.description,
    id: row.id,
    isPrivate: row.is_private,
    isRanked: row.is_ranked,
    itemsCount: row.items_count,
    likesCount: row.likes_count,
    previews: previews[index] ?? [],
    reviewsCount: row.reviews_count,
    slug: row.slug,
    title: row.title,
    updatedAt: row.updated_at,
  }));
}

export async function getListsPage({
  accountId,
  client,
  page,
  sort,
}: {
  accountId: string;
  client: Client;
  page: number;
  sort: ListSort;
}): Promise<Paged<ListCardData>> {
  const { from, to } = pageRange(page, LIST_PAGE_SIZE);
  const [column, ascending] = {
    created_asc: ["created_at", true],
    created_desc: ["created_at", false],
    items_desc: ["items_count", false],
    likes_desc: ["likes_count", false],
    title_asc: ["title", true],
    updated_desc: ["updated_at", false],
  }[sort] as [string, boolean];

  const { count, data, error } = await client
    .from("lists")
    .select(LIST_COLUMNS, { count: "exact" })
    .eq("account_id", accountId)
    .order(column as "created_at", { ascending })
    .order("id")
    .range(from, to);
  if (error) throw error;

  return paged(
    await withPreviews(client, (data ?? []) as ListRow[]),
    count,
    page,
    LIST_PAGE_SIZE,
  );
}

export async function getRecentLists({
  accountId,
  client,
  limit,
}: {
  accountId: string;
  client: Client;
  limit: number;
}): Promise<ListCardData[]> {
  const { data, error } = await client
    .from("lists")
    .select(LIST_COLUMNS)
    .eq("account_id", accountId)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return withPreviews(client, (data ?? []) as ListRow[]);
}

export async function getListDetail({
  client,
  slug,
  username,
  viewerId,
}: {
  client: Client;
  slug: string;
  username: string;
  viewerId: string | null;
}): Promise<ListDetail | null> {
  const owner = await client
    .from("accounts")
    .select("id, username, display_name")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  if (owner.error) throw owner.error;
  const ownerName = owner.data?.username;
  if (!owner.data || !ownerName) return null;

  const list = await client
    .from("lists")
    .select(LIST_COLUMNS)
    .eq("account_id", owner.data.id)
    .eq("slug", slug)
    .maybeSingle();
  if (list.error) throw list.error;
  if (!list.data) return null;
  const row = list.data as ListRow;

  let liked = false;
  if (viewerId) {
    const like = await client
      .from("list_likes")
      .select("list_id", { count: "exact", head: true })
      .eq("list_id", row.id)
      .eq("account_id", viewerId);
    liked = (like.count ?? 0) > 0;
  }

  return {
    description: row.description,
    id: row.id,
    isPrivate: row.is_private,
    isRanked: row.is_ranked,
    itemsCount: row.items_count,
    liked,
    likesCount: row.likes_count,
    owner: {
      displayName: owner.data.display_name || ownerName,
      id: owner.data.id,
      username: ownerName,
    },
    reviewsCount: row.reviews_count,
    slug: row.slug,
    title: row.title,
    updatedAt: row.updated_at,
  };
}

interface CommentRow {
  author: {
    avatar_url: string | null;
    display_name: string | null;
    id: string;
    username: string;
  } | null;
  content: string;
  created_at: string;
  id: string;
  likes_count: number;
}

export async function getListComments({
  client,
  limit = 50,
  listId,
  viewerId,
}: {
  client: Client;
  limit?: number;
  listId: string;
  viewerId: string | null;
}): Promise<ListComment[]> {
  const { data, error } = await client
    .from("reviews")
    .select(
      "id, content, likes_count, created_at, author:accounts!reviews_account_id_fkey(id, username, display_name, avatar_url)",
    )
    .eq("list_id", listId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  const rows = (data ?? []) as unknown as CommentRow[];
  const liked = await likedReviewIds(
    client,
    viewerId,
    rows.map((row) => row.id),
  );

  return rows.flatMap((row) =>
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
            liked: liked.has(row.id),
            likesCount: row.likes_count,
          },
        ]
      : [],
  );
}

async function likedReviewIds(
  client: Client,
  viewerId: string | null,
  reviewIds: string[],
): Promise<Set<string>> {
  if (!viewerId || reviewIds.length === 0) return new Set();
  const { data } = await client
    .from("review_likes")
    .select("review_id")
    .eq("account_id", viewerId)
    .in("review_id", reviewIds);
  return new Set((data ?? []).map((row) => row.review_id));
}

interface ReviewRow {
  content: string;
  created_at: string;
  id: string;
  is_spoiler: boolean;
  likes_count: number;
  poster_path: string | null;
  rating: number | null;
  release_date: string | null;
  title: string | null;
  tmdb_id: number | null;
  updated_at: string;
}

const REVIEW_COLUMNS =
  "id, tmdb_id, title, poster_path, release_date, content, rating, is_spoiler, likes_count, created_at, updated_at";

const toReviewCard = (row: ReviewRow, liked: Set<string>): ReviewCardData[] =>
  row.tmdb_id === null
    ? []
    : [
        {
          content: row.content,
          createdAt: row.created_at,
          id: row.id,
          isSpoiler: row.is_spoiler,
          liked: liked.has(row.id),
          likesCount: row.likes_count,
          posterPath: row.poster_path,
          rating: row.rating === null ? null : Number(row.rating),
          title: row.title ?? "Untitled",
          tmdbId: row.tmdb_id,
          updatedAt: row.updated_at,
          year: releaseYear(row.release_date),
        },
      ];

export async function getReviewsPage({
  accountId,
  client,
  filters,
  viewerId,
}: {
  accountId: string;
  client: Client;
  filters: ReviewFilters;
  viewerId: string | null;
}): Promise<Paged<ReviewCardData>> {
  const { from, to } = pageRange(filters.page, REVIEW_PAGE_SIZE);

  let query = client
    .from("reviews")
    .select(REVIEW_COLUMNS, { count: "exact" })
    .eq("account_id", accountId)
    .not("tmdb_id", "is", null);

  if (filters.kind === "written") query = query.neq("content", "");
  if (filters.kind === "ratings") query = query.eq("content", "");
  if (filters.query) {
    const pattern = likePattern(filters.query);
    query = query.or(`title.ilike.${pattern},content.ilike.${pattern}`);
  }

  const [column, ascending] = {
    likes_desc: ["likes_count", false],
    newest: ["updated_at", false],
    oldest: ["updated_at", true],
    rating_asc: ["rating", true],
    rating_desc: ["rating", false],
  }[filters.sort] as [string, boolean];

  const { count, data, error } = await query
    .order(column as "created_at", { ascending, nullsFirst: false })
    .order("id")
    .range(from, to);
  if (error) throw error;

  const rows = (data ?? []) as ReviewRow[];
  const liked = await likedReviewIds(
    client,
    viewerId,
    rows.map((row) => row.id),
  );

  return paged(
    rows.flatMap((row) => toReviewCard(row, liked)),
    count,
    filters.page,
    REVIEW_PAGE_SIZE,
  );
}

export async function getRecentReviews({
  accountId,
  client,
  limit,
  viewerId,
}: {
  accountId: string;
  client: Client;
  limit: number;
  viewerId: string | null;
}): Promise<ReviewCardData[]> {
  const { data, error } = await client
    .from("reviews")
    .select(REVIEW_COLUMNS)
    .eq("account_id", accountId)
    .not("tmdb_id", "is", null)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  const rows = (data ?? []) as ReviewRow[];
  const liked = await likedReviewIds(
    client,
    viewerId,
    rows.map((row) => row.id),
  );
  return rows.flatMap((row) => toReviewCard(row, liked));
}

interface ActivityRow {
  created_at: string;
  id: string;
  payload: Record<string, unknown> | null;
  target: { display_name: string | null; username: string } | null;
  tmdb_id: number | null;
  type: string;
}

const ACTIVITY_COLUMNS =
  "id, type, tmdb_id, payload, created_at, target:accounts!account_activity_target_account_id_fkey(username, display_name)";

const text = (value: unknown): string | null =>
  typeof value === "string" && value ? value : null;

function toActivityItem(
  row: ActivityRow,
  accountUsername: string,
): ActivityItem {
  const payload = row.payload ?? {};
  const slug = text(payload.slug);
  const isOwnList = row.type === "LIST_CREATED";

  return {
    createdAt: row.created_at,
    id: row.id,
    list: slug ? { slug, title: text(payload.title) ?? "a list" } : null,
    listOwner: slug
      ? isOwnList
        ? accountUsername
        : (row.target?.username ?? null)
      : null,
    posterPath: text(payload.poster_path),
    rating: typeof payload.rating === "number" ? payload.rating : null,
    target: row.target
      ? {
          displayName: row.target.display_name || row.target.username,
          username: row.target.username,
        }
      : null,
    title: slug ? null : text(payload.title),
    tmdbId: row.tmdb_id,
    type: row.type,
  };
}

export async function getActivityPage({
  accountId,
  accountUsername,
  client,
  filters,
}: {
  accountId: string;
  accountUsername: string;
  client: Client;
  filters: ActivityFilters;
}): Promise<Paged<ActivityItem>> {
  const { from, to } = pageRange(filters.page, ACTIVITY_PAGE_SIZE);
  const types = ACTIVITY_TYPES[filters.group];

  let query = client
    .from("account_activity")
    .select(ACTIVITY_COLUMNS, { count: "exact" })
    .eq("account_id", accountId);
  if (types.length > 0) query = query.in("type", [...types]);

  const { count, data, error } = await query
    .order("created_at", { ascending: filters.sort === "oldest" })
    .order("id")
    .range(from, to);
  if (error) throw error;

  return paged(
    ((data ?? []) as unknown as ActivityRow[]).map((row) =>
      toActivityItem(row, accountUsername),
    ),
    count,
    filters.page,
    ACTIVITY_PAGE_SIZE,
  );
}

export async function getRecentActivity({
  accountId,
  accountUsername,
  client,
  limit,
}: {
  accountId: string;
  accountUsername: string;
  client: Client;
  limit: number;
}): Promise<ActivityItem[]> {
  const { data, error } = await client
    .from("account_activity")
    .select(ACTIVITY_COLUMNS)
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as unknown as ActivityRow[]).map((row) =>
    toActivityItem(row, accountUsername),
  );
}

interface DiaryEntryRow {
  id: string;
  is_rewatch: boolean;
  poster_path: string | null;
  release_date: string | null;
  title: string;
  tmdb_id: number;
  watched_on: string;
}

export async function getDiaryMonth({
  accountId,
  client,
  month,
}: {
  accountId: string;
  client: Client;
  month: string | null;
}): Promise<DiaryMonth> {
  const edge = (ascending: boolean) =>
    client
      .from("account_diary")
      .select("watched_on")
      .eq("account_id", accountId)
      .order("watched_on", { ascending })
      .limit(1)
      .maybeSingle();

  const [first, last] = await Promise.all([edge(true), edge(false)]);
  const firstMonth = first.data?.watched_on.slice(0, 7) ?? null;
  const lastMonth = last.data?.watched_on.slice(0, 7) ?? null;
  const target = month ?? lastMonth ?? new Date().toISOString().slice(0, 7);

  const { from, to } = monthBounds(target);
  const { data, error } = await client
    .from("account_diary")
    .select(
      "id, tmdb_id, title, poster_path, release_date, watched_on, is_rewatch",
    )
    .eq("account_id", accountId)
    .gte("watched_on", from)
    .lt("watched_on", to)
    .order("watched_on", { ascending: false })
    .order("watched_at", { ascending: false })
    .limit(400);
  if (error) throw error;

  const entries = (data ?? []) as DiaryEntryRow[];
  const reviews =
    entries.length > 0
      ? await client
          .from("reviews")
          .select("tmdb_id, rating, content")
          .eq("account_id", accountId)
          .in("tmdb_id", [...new Set(entries.map((entry) => entry.tmdb_id))])
      : null;
  const byMovie = new Map(
    (reviews?.data ?? []).flatMap((review) =>
      review.tmdb_id === null ? [] : [[review.tmdb_id, review] as const],
    ),
  );

  return {
    first: firstMonth,
    last: lastMonth,
    month: target,
    rows: entries.map((entry) => {
      const review = byMovie.get(entry.tmdb_id);
      return {
        hasReview: Boolean(review?.content.trim()),
        id: entry.id,
        isRewatch: entry.is_rewatch,
        posterPath: entry.poster_path,
        rating:
          review?.rating === null || review?.rating === undefined
            ? null
            : Number(review.rating),
        title: entry.title,
        tmdbId: entry.tmdb_id,
        watchedOn: entry.watched_on,
        year: releaseYear(entry.release_date),
      };
    }),
  };
}
