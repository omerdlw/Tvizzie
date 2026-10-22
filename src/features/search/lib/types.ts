export const SEARCH_TYPES = [
  "movies",
  "people",
  "users",
  "lists",
  "reviews",
] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];

// Every hit carries `match`, how closely its title reads as the query, and
// `score`, that match with how well known the hit is on a scale shared by
// every kind (see lib/rank.ts), so the overview can weigh one kind against
// another.
export interface MovieSearchHit {
  id: number;
  match: number;
  score: number;
  posterPath: string | null;
  title: string;
  year: number | null;
}

export interface PersonSearchHit {
  department: string | null;
  id: number;
  knownFor: string[];
  match: number;
  score: number;
  name: string;
  profilePath: string | null;
}

export interface UserSearchHit {
  avatarUrl: string | null;
  displayName: string;
  followersCount: number;
  id: string;
  isPrivate: boolean;
  match: number;
  score: number;
  username: string;
}

export interface ListSearchHit {
  id: string;
  itemsCount: number;
  likesCount: number;
  match: number;
  score: number;
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
  match: number;
  score: number;
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
