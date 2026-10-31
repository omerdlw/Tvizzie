export const REVIEW_MIN_LENGTH = 10;
export const REVIEW_MAX_LENGTH = 800;

export const REVIEWS_PAGE_SIZE = 20;

export const MOVIE_REVIEW_SORTS = [
  { label: "Newest to oldest", value: "newest" },
  { label: "Oldest to newest", value: "oldest" },
  { label: "Highest rating to lowest rating", value: "rating_desc" },
  { label: "Lowest rating to highest rating", value: "rating_asc" },
  { label: "Most liked to least liked", value: "likes_desc" },
  { label: "Least liked to most liked", value: "likes_asc" },
] as const;

export type MovieReviewSort = (typeof MOVIE_REVIEW_SORTS)[number]["value"];

export function isMovieReviewSort(value: unknown): value is MovieReviewSort {
  return MOVIE_REVIEW_SORTS.some((sort) => sort.value === value);
}

export const MOVIE_REVIEW_FILTERS = [
  { label: "All entries", value: "all" },
  { label: "Written reviews", value: "written" },
  { label: "5 stars", value: "5" },
  { label: "4 stars", value: "4" },
  { label: "3 stars", value: "3" },
  { label: "2 stars", value: "2" },
  { label: "1 star", value: "1" },
] as const;

export type MovieReviewFilter = (typeof MOVIE_REVIEW_FILTERS)[number]["value"];

export function isMovieReviewFilter(
  value: unknown,
): value is MovieReviewFilter {
  return MOVIE_REVIEW_FILTERS.some((filter) => filter.value === value);
}

export const REVIEW_EVENTS = Object.freeze({ CHANGE: "reviews:change" });
