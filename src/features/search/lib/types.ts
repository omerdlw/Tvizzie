export const SEARCH_TYPES = [
  "movies",
  "people",
  "users",
  "lists",
  "reviews",
] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];

export interface MovieSearchHit {
  id: number;
  posterPath: string | null;
  title: string;
  year: number | null;
}

export interface PersonSearchHit {
  department: string | null;
  id: number;
  name: string;
  profilePath: string | null;
}

export interface UserSearchHit {
  avatarUrl: string | null;
  displayName: string;
  followersCount: number;
  id: string;
  isPrivate: boolean;
  username: string;
}

export interface ListSearchHit {
  id: string;
  itemsCount: number;
  likesCount: number;
  owner: { displayName: string; username: string };
  posterPath: string | null;
  slug: string;
  title: string;
}

export interface ReviewSearchHit {
  author: { avatarUrl: string | null; displayName: string; username: string };
  excerpt: string;
  id: string;
  isSpoiler: boolean;
  likesCount: number;
  posterPath: string | null;
  rating: number | null;
  title: string;
  tmdbId: number;
  year: number | null;
}

export interface SearchResponse<Hit> {
  hits: Hit[];
  page: number;
  totalPages: number;
  totalResults: number;
}

export type MovieSearchResponse = SearchResponse<MovieSearchHit>;
export type PersonSearchResponse = SearchResponse<PersonSearchHit>;
export type UserSearchResponse = SearchResponse<UserSearchHit>;
export type ListSearchResponse = SearchResponse<ListSearchHit>;
export type ReviewSearchResponse = SearchResponse<ReviewSearchHit>;

export interface SearchResponseMap {
  lists: ListSearchResponse;
  movies: MovieSearchResponse;
  people: PersonSearchResponse;
  reviews: ReviewSearchResponse;
  users: UserSearchResponse;
}

export type SearchScope = "all" | SearchType;

export interface SearchResults {
  lists: ListSearchHit[];
  movies: MovieSearchHit[];
  people: PersonSearchHit[];
  reviews: ReviewSearchHit[];
  users: UserSearchHit[];
}

export type SearchFailureCode =
  "aborted" | "invalid_query" | "rate_limited" | "unavailable";

export interface SearchFailure {
  code: SearchFailureCode;
  message: string;
}
