export type SearchParams = Record<string, string | string[] | undefined>;

export const MEDIA_PAGE_SIZE = 36;
export const LIST_PAGE_SIZE = 18;
export const REVIEW_PAGE_SIZE = 20;
export const ACTIVITY_PAGE_SIZE = 30;

interface Option<T extends string = string> {
  label: string;
  value: T;
}

export function readParam(
  params: SearchParams | undefined,
  key: string,
): string {
  const value = params?.[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function pickOption<T extends string>(
  value: string,
  options: readonly Option<T>[],
  fallback: T,
): T {
  return options.find((option) => option.value === value)?.value ?? fallback;
}

export function readPage(params: SearchParams | undefined): number {
  const page = Number.parseInt(readParam(params, "page"), 10);
  return Number.isInteger(page) && page > 0 && page <= 10_000 ? page : 1;
}

function readQuery(params: SearchParams | undefined): string {
  return readParam(params, "q").slice(0, 80);
}

export function likePattern(query: string): string {
  return `%${query
    .replace(/[\\%_,()*"]/g, " ")
    .replace(/\s+/g, " ")
    .trim()}%`;
}

export function pageRange(page: number, size: number) {
  const from = (page - 1) * size;
  return { from, to: from + size - 1 };
}

export function pageCount(total: number, size: number): number {
  return Math.max(1, Math.ceil(total / size));
}

export const MEDIA_SORTS = [
  { label: "Recently added", value: "added_desc" },
  { label: "Added first", value: "added_asc" },
  { label: "Newest release", value: "release_desc" },
  { label: "Oldest release", value: "release_asc" },
  { label: "Title A–Z", value: "title_asc" },
  { label: "Title Z–A", value: "title_desc" },
] as const satisfies readonly Option[];

export type MediaSort = (typeof MEDIA_SORTS)[number]["value"];

export const LIST_ITEM_SORTS = [
  { label: "List order", value: "position" },
  ...MEDIA_SORTS,
] as const satisfies readonly Option[];

export type ListItemSort = (typeof LIST_ITEM_SORTS)[number]["value"];

export const GENRES: readonly { id: number; label: string }[] = [
  { id: 28, label: "Action" },
  { id: 12, label: "Adventure" },
  { id: 16, label: "Animation" },
  { id: 35, label: "Comedy" },
  { id: 80, label: "Crime" },
  { id: 99, label: "Documentary" },
  { id: 18, label: "Drama" },
  { id: 10751, label: "Family" },
  { id: 14, label: "Fantasy" },
  { id: 36, label: "History" },
  { id: 27, label: "Horror" },
  { id: 10402, label: "Music" },
  { id: 9648, label: "Mystery" },
  { id: 10749, label: "Romance" },
  { id: 878, label: "Science Fiction" },
  { id: 53, label: "Thriller" },
  { id: 10752, label: "War" },
  { id: 37, label: "Western" },
];

export const DECADES: readonly number[] = Array.from(
  { length: 11 },
  (_, index) => 2020 - index * 10,
);

export interface MediaFilters {
  decade: number | null;
  genre: number | null;
  page: number;
  query: string;
  sort: MediaSort;
}

export interface ListItemFilters extends Omit<MediaFilters, "sort"> {
  sort: ListItemSort;
}

function readGenre(params: SearchParams | undefined): number | null {
  const id = Number(readParam(params, "genre"));
  return GENRES.some((genre) => genre.id === id) ? id : null;
}

function readDecade(params: SearchParams | undefined): number | null {
  const decade = Number(readParam(params, "decade"));
  return DECADES.includes(decade) ? decade : null;
}

export function parseMediaFilters(
  params: SearchParams | undefined,
): MediaFilters {
  return {
    decade: readDecade(params),
    genre: readGenre(params),
    page: readPage(params),
    query: readQuery(params),
    sort: pickOption(readParam(params, "sort"), MEDIA_SORTS, "added_desc"),
  };
}

export function parseListItemFilters(
  params: SearchParams | undefined,
): ListItemFilters {
  return {
    decade: readDecade(params),
    genre: readGenre(params),
    page: readPage(params),
    query: readQuery(params),
    sort: pickOption(readParam(params, "sort"), LIST_ITEM_SORTS, "position"),
  };
}

export const hasMediaFilters = (
  filters: Pick<MediaFilters, "decade" | "genre" | "query">,
) => Boolean(filters.query || filters.genre || filters.decade);

export const LIST_SORTS = [
  { label: "Recently updated", value: "updated_desc" },
  { label: "Newest", value: "created_desc" },
  { label: "Oldest", value: "created_asc" },
  { label: "Most films", value: "items_desc" },
  { label: "Most liked", value: "likes_desc" },
  { label: "Title A–Z", value: "title_asc" },
] as const satisfies readonly Option[];

export type ListSort = (typeof LIST_SORTS)[number]["value"];

export function parseListSort(params: SearchParams | undefined): ListSort {
  return pickOption(readParam(params, "sort"), LIST_SORTS, "updated_desc");
}

export const REVIEW_SORTS = [
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Highest rated", value: "rating_desc" },
  { label: "Lowest rated", value: "rating_asc" },
  { label: "Most liked", value: "likes_desc" },
] as const satisfies readonly Option[];

export type ReviewSort = (typeof REVIEW_SORTS)[number]["value"];

export const REVIEW_KINDS = [
  { label: "Reviews and ratings", value: "all" },
  { label: "Written reviews", value: "written" },
  { label: "Ratings only", value: "ratings" },
] as const satisfies readonly Option[];

export type ReviewKind = (typeof REVIEW_KINDS)[number]["value"];

export interface ReviewFilters {
  kind: ReviewKind;
  page: number;
  query: string;
  sort: ReviewSort;
}

export function parseReviewFilters(
  params: SearchParams | undefined,
): ReviewFilters {
  return {
    kind: pickOption(readParam(params, "kind"), REVIEW_KINDS, "all"),
    page: readPage(params),
    query: readQuery(params),
    sort: pickOption(readParam(params, "sort"), REVIEW_SORTS, "newest"),
  };
}

export const ACTIVITY_GROUPS = [
  { label: "Everything", value: "all" },
  { label: "Diary", value: "diary" },
  { label: "Watched", value: "watched" },
  { label: "Watchlist", value: "watchlist" },
  { label: "Likes", value: "likes" },
  { label: "Reviews and ratings", value: "reviews" },
  { label: "Lists", value: "lists" },
  { label: "Follows", value: "follows" },
] as const satisfies readonly Option[];

export type ActivityGroup = (typeof ACTIVITY_GROUPS)[number]["value"];

export const ACTIVITY_TYPES: Record<ActivityGroup, readonly string[]> = {
  all: [],
  diary: ["WATCH_DIARY_LOGGED", "WATCH_DIARY_REWATCHED"],
  follows: ["FOLLOW_CREATED"],
  likes: ["LIKED_ADDED"],
  lists: ["LIST_CREATED", "LIST_LIKED", "LIST_COMMENTED"],
  reviews: ["REVIEW_PUBLISHED", "RATING_LOGGED", "REVIEW_LIKED"],
  watched: ["WATCHED_ADDED"],
  watchlist: ["WATCHLIST_ADDED"],
};

export const ACTIVITY_SORTS = [
  { label: "Newest first", value: "newest" },
  { label: "Oldest first", value: "oldest" },
] as const satisfies readonly Option[];

export type ActivitySort = (typeof ACTIVITY_SORTS)[number]["value"];

export interface ActivityFilters {
  group: ActivityGroup;
  page: number;
  sort: ActivitySort;
}

export function parseActivityFilters(
  params: SearchParams | undefined,
): ActivityFilters {
  return {
    group: pickOption(readParam(params, "type"), ACTIVITY_GROUPS, "all"),
    page: readPage(params),
    sort: pickOption(readParam(params, "sort"), ACTIVITY_SORTS, "newest"),
  };
}

export function readMonth(params: SearchParams | undefined): string | null {
  const value = readParam(params, "month");
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const month = Number(match[2]);
  return month >= 1 && month <= 12 ? value : null;
}

export function shiftMonth(month: string, offset: number): string {
  const [year, index] = month.split("-").map(Number) as [number, number];
  const date = new Date(Date.UTC(year, index - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
}

export function monthBounds(month: string): { from: string; to: string } {
  return { from: `${month}-01`, to: `${shiftMonth(month, 1)}-01` };
}
