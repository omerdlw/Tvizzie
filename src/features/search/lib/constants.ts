import type { SearchScope, SearchType } from "./types";

export const SEARCH_MIN_QUERY_LENGTH = 2;
export const SEARCH_MAX_QUERY_LENGTH = 100;
export const SEARCH_DEBOUNCE_MS = 300;

export const SEARCH_ENDPOINTS: Readonly<Record<SearchType, string>> = {
  lists: "/api/search/lists",
  movies: "/api/search/movies",
  people: "/api/search/people",
  reviews: "/api/search/reviews",
  users: "/api/search/users",
};

export const COMMUNITY_SEARCH_TYPES: readonly SearchType[] = [
  "users",
  "lists",
  "reviews",
];

export const SEARCH_COMMUNITY_LIMIT = 12;

export const SEARCH_SCOPE_ITEMS: readonly {
  key: SearchScope;
  label: string;
}[] = [
  { key: "all", label: "All" },
  { key: "movies", label: "Movies" },
  { key: "people", label: "People" },
  { key: "users", label: "Users" },
  { key: "lists", label: "Lists" },
  { key: "reviews", label: "Reviews" },
];

export const SEARCH_NOUNS: Readonly<Record<SearchScope, string>> = {
  all: "results",
  lists: "lists",
  movies: "movies",
  people: "people",
  reviews: "reviews",
  users: "users",
};

export const SEARCH_PER_PAGE: Readonly<Record<SearchType, number>> = {
  lists: 3,
  movies: 8,
  people: 3,
  reviews: 3,
  users: 3,
};
export const SEARCH_OVERVIEW: Readonly<Record<SearchType, number>> = {
  lists: 1,
  movies: 4,
  people: 1,
  reviews: 1,
  users: 1,
};

export const SEARCH_ICON = "solar:magnifer-linear";
export const SEARCH_PLACEHOLDER_DESCRIPTION =
  "Search movies, people, users, lists and reviews";
export const SEARCH_ACTION_KEY = "search.open";
export const SEARCH_ACTION_ORDER = -20;
