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
  ActivityDays,
  ActivityItem,
  DiaryEntry,
  DiaryMonth,
  ListCardData,
  ListComment,
  ListDetail,
  MediaItem,
  Paged,
  PersonPreview,
  ReviewCardData,
} from "../lib/browse-data";
type Client = SupabaseClient<Database>;

type LibraryCounts = Record<
  "diary" | "likes" | "lists" | "reviews" | "watched" | "watchlist",
  number
>;

const EMPTY_LIBRARY_COUNTS: LibraryCounts = Object.freeze({
  diary: 0,
  likes: 0,
  lists: 0,
  reviews: 0,
  watched: 0,
  watchlist: 0,
});

function releaseYear(value: string | null | undefined): number | null {
  const year = Number(value?.slice(0, 4));
  return Number.isInteger(year) && year > 0 ? year : null;
}

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

interface PageResult<Row> {
  count: number | null;
  data: Row[] | null;
  error: { code?: string; details?: string } | null;
}

async function readPage<Row>(
  query: { range(from: number, to: number): PromiseLike<PageResult<Row>> },
  page: number,
  size: number,
  retried = false,
): Promise<{ count: number | null; page: number; rows: Row[] }> {
  const { from, to } = pageRange(page, size);
  const result = await query.range(from, to);
  if (result.error?.code === "PGRST103" && !retried) {
    const rows = Number(
      /only (\d+) rows/.exec(result.error.details ?? "")?.[1],
    );
    const last = Math.max(1, pageCount(Number.isFinite(rows) ? rows : 0, size));
    return readPage(query, last, size, true);
  }
  if (result.error) throw result.error;
  return { count: result.count, page, rows: result.data ?? [] };
}

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
  const added = kind === "watched" ? "last_watched_at" : "created_at";

  const query = filterMovies(
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

  const [result, favorites] = await Promise.all([
    readPage(
      query
        .order(column as "created_at", { ascending, nullsFirst: false })
        .order("tmdb_id", { ascending: false }),
      filters.page,
      MEDIA_PAGE_SIZE,
    ),
    kind === "likes"
      ? client
          .from("account_favorites")
          .select("tmdb_id")
          .eq("account_id", accountId)
      : null,
  ]);

  const pinned = new Set((favorites?.data ?? []).map((row) => row.tmdb_id));
  return paged(
    (result.rows as MovieRow[]).map((row) => toMediaItem(row, pinned)),
    result.count,
    result.page,
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
  const previews = new Map<string, (string | null)[]>();
  if (rows.length > 0) {
    const { data, error } = await client.rpc("get_list_previews", {
      p_limit: 5,
      p_list_ids: rows.map((row) => row.id),
    });
    if (error) throw error;
    for (const item of data ?? []) {
      const posters = previews.get(item.list_id) ?? [];
      posters.push(item.poster_path);
      previews.set(item.list_id, posters);
    }
  }

  return rows.map((row) => toListCard(row, previews.get(row.id) ?? []));
}

const toListCard = (
  row: ListRow,
  previews: (string | null)[],
): ListCardData => ({
  description: row.description,
  id: row.id,
  isPrivate: row.is_private,
  isRanked: row.is_ranked,
  itemsCount: row.items_count,
  likesCount: row.likes_count,
  previews,
  reviewsCount: row.reviews_count,
  slug: row.slug,
  title: row.title,
  updatedAt: row.updated_at,
});

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
  const [column, ascending] = {
    created_asc: ["created_at", true],
    created_desc: ["created_at", false],
    items_desc: ["items_count", false],
    likes_desc: ["likes_count", false],
    title_asc: ["title", true],
    updated_desc: ["updated_at", false],
  }[sort] as [string, boolean];

  const result = await readPage(
    client
      .from("lists")
      .select(LIST_COLUMNS, { count: "exact" })
      .eq("account_id", accountId)
      .order(column as "created_at", { ascending })
      .order("id"),
    page,
    LIST_PAGE_SIZE,
  );

  return paged(
    await withPreviews(client, result.rows as ListRow[]),
    result.count,
    result.page,
    LIST_PAGE_SIZE,
  );
}

interface ListPageRow {
  comments: {
    rows: {
      author: {
        avatar_url: string | null;
        display_name: string | null;
        id: string;
        username: string;
      };
      content: string;
      created_at: string;
      id: string;
      liked: boolean;
      likes_count: number;
    }[];
    total: number;
  };
  items: MovieRow[];
  items_total: number;
  list: ListRow & { liked: boolean; poster_path: string | null };
  own_comment: string | null;
  page: number;
}

interface ListPageData {
  commentCount: number;
  comments: ListComment[];
  items: Paged<MediaItem>;
  list: ListDetail;
  ownComment: string | null;
}

export async function getListPage({
  client,
  comments = 50,
  filters,
  owner,
  slug,
}: {
  client: Client;
  comments?: number;
  filters: ListItemFilters;
  owner: { displayName: string; id: string; username: string };
  slug: string;
}): Promise<ListPageData | null> {
  const { data, error } = await client.rpc("get_list_page", {
    p_account_id: owner.id,
    p_comments: comments,
    p_decade: filters.decade,
    p_genre: filters.genre,
    p_page: filters.page,
    p_page_size: MEDIA_PAGE_SIZE,
    p_pattern: filters.query ? likePattern(filters.query) : null,
    p_slug: slug,
    p_sort: filters.sort,
  });
  if (error) throw error;

  const row = data as unknown as ListPageRow | null;
  if (!row) return null;
  const list = row.list;

  return {
    commentCount: row.comments.total,
    comments: row.comments.rows.map((comment) => ({
      author: {
        avatarUrl: comment.author.avatar_url,
        displayName: comment.author.display_name || comment.author.username,
        id: comment.author.id,
        username: comment.author.username,
      },
      content: comment.content,
      createdAt: comment.created_at,
      id: comment.id,
      liked: comment.liked,
      likesCount: comment.likes_count,
    })),
    items: paged(
      row.items.map((item) => toMediaItem(item, new Set())),
      row.items_total,
      row.page,
      MEDIA_PAGE_SIZE,
    ),
    list: {
      description: list.description,
      id: list.id,
      isPrivate: list.is_private,
      isRanked: list.is_ranked,
      itemsCount: list.items_count,
      liked: list.liked,
      likesCount: list.likes_count,
      owner: {
        displayName: owner.displayName || owner.username,
        id: owner.id,
        username: owner.username,
      },
      posterPath: list.poster_path,
      reviewsCount: list.reviews_count,
      slug: list.slug,
      title: list.title,
      updatedAt: list.updated_at,
    },
    ownComment: row.own_comment,
  };
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
  backdrop_path: string | null;
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
  "id, tmdb_id, title, poster_path, backdrop_path, release_date, content, rating, is_spoiler, likes_count, created_at, updated_at";

const toReviewCard = (row: ReviewRow, liked: Set<string>): ReviewCardData[] =>
  row.tmdb_id === null
    ? []
    : [
        {
          backdropPath: row.backdrop_path,
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

  const result = await readPage(
    query
      .order(column as "created_at", { ascending, nullsFirst: false })
      .order("id"),
    filters.page,
    REVIEW_PAGE_SIZE,
  );

  const rows = result.rows as ReviewRow[];
  const liked = await likedReviewIds(
    client,
    viewerId,
    rows.map((row) => row.id),
  );

  return paged(
    rows.flatMap((row) => toReviewCard(row, liked)),
    result.count,
    result.page,
    REVIEW_PAGE_SIZE,
  );
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
  const types = ACTIVITY_TYPES[filters.group];

  let query = client
    .from("account_activity")
    .select(ACTIVITY_COLUMNS, { count: "exact" })
    .eq("account_id", accountId);
  if (types.length > 0) query = query.in("type", [...types]);

  const result = await readPage(
    query
      .order("created_at", { ascending: filters.sort === "oldest" })
      .order("id"),
    filters.page,
    ACTIVITY_PAGE_SIZE,
  );

  return paged(
    (result.rows as unknown as ActivityRow[]).map((row) =>
      toActivityItem(row, accountUsername),
    ),
    result.count,
    result.page,
    ACTIVITY_PAGE_SIZE,
  );
}

interface OverviewRow {
  activity: ActivityRow[];
  activity_days: { counts: number[] | null; from: string } | null;
  diary: { id: string; title: string; tmdb_id: number; watched_on: string }[];
  favorites: MovieRow[];
  following: {
    avatar_url: string | null;
    display_name: string | null;
    username: string;
  }[];
  lists: (ListRow & { previews: (string | null)[] })[];
  popular_reviews: (ReviewRow & { liked: boolean })[];
  rating_spread: number[] | null;
  recent_reviews: (ReviewRow & { liked: boolean })[];
  stats: {
    diary_count: number;
    following_count: number;
    likes_count: number;
    lists_count: number;
    reviews_count: number;
    watched_count: number;
    watchlist_count: number;
  } | null;
  watched: MovieRow[];
  watchlist: MovieRow[];
}

interface AccountOverviewData {
  activity: ActivityItem[];
  activityDays: ActivityDays;
  counts: LibraryCounts;
  diary: DiaryEntry[];
  favorites: MediaItem[];
  following: PersonPreview[];
  followingCount: number;
  lists: ListCardData[];
  popular: ReviewCardData[];
  reviews: ReviewCardData[];
  spread: number[];
  watched: MediaItem[];
  watchlist: MediaItem[];
}

const EMPTY_OVERVIEW: OverviewRow = {
  activity: [],
  activity_days: null,
  diary: [],
  favorites: [],
  following: [],
  lists: [],
  popular_reviews: [],
  rating_spread: null,
  recent_reviews: [],
  stats: null,
  watched: [],
  watchlist: [],
};

const reviewCards = (rows: (ReviewRow & { liked: boolean })[]) => {
  const liked = new Set(rows.filter((row) => row.liked).map((row) => row.id));
  return rows.flatMap((row) => toReviewCard(row, liked));
};

export async function getAccountOverview({
  accountId,
  accountUsername,
  client,
  limits,
}: {
  accountId: string;
  accountUsername: string;
  client: Client;
  limits: {
    activity: number;
    diary: number;
    following: number;
    lists: number;
    popular: number;
    reviews: number;
    watched: number;
    watchlist: number;
  };
}): Promise<AccountOverviewData> {
  const { data, error } = await client.rpc("get_account_overview", {
    p_account_id: accountId,
    p_activity: limits.activity,
    p_diary: limits.diary,
    p_following: limits.following,
    p_lists: limits.lists,
    p_popular: limits.popular,
    p_reviews: limits.reviews,
    p_watched: limits.watched,
    p_watchlist: limits.watchlist,
  });
  if (error) throw error;

  const row = (data as unknown as OverviewRow | null) ?? EMPTY_OVERVIEW;
  const stats = row.stats;
  const none = new Set<number>();

  return {
    activity: row.activity.map((item) => toActivityItem(item, accountUsername)),
    activityDays: {
      counts: (row.activity_days?.counts ?? []).map(Number),
      from: row.activity_days?.from ?? "",
    },
    counts: stats
      ? {
          diary: stats.diary_count,
          likes: stats.likes_count,
          lists: stats.lists_count,
          reviews: stats.reviews_count,
          watched: stats.watched_count,
          watchlist: stats.watchlist_count,
        }
      : EMPTY_LIBRARY_COUNTS,
    diary: row.diary.map((entry) => ({
      id: entry.id,
      title: entry.title,
      tmdbId: entry.tmdb_id,
      watchedOn: entry.watched_on,
    })),
    favorites: row.favorites.map((film) => toMediaItem(film, none)),
    following: row.following.map((person) => ({
      avatarUrl: person.avatar_url,
      displayName: person.display_name || person.username,
      username: person.username,
    })),
    followingCount: stats?.following_count ?? 0,
    lists: row.lists.map((list) => toListCard(list, list.previews)),
    popular: reviewCards(row.popular_reviews),
    reviews: reviewCards(row.recent_reviews),
    spread: Array.from(
      { length: 10 },
      (_, index) => Number(row.rating_spread?.[index]) || 0,
    ),
    watched: row.watched.map((film) => toMediaItem(film, none)),
    watchlist: row.watchlist.map((film) => toMediaItem(film, none)),
  };
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
