export type LibraryTab =
  "diary" | "likes" | "lists" | "reviews" | "watched" | "watchlist";

export type LibraryCounts = Record<LibraryTab, number>;

export const EMPTY_LIBRARY_COUNTS: LibraryCounts = Object.freeze({
  diary: 0,
  likes: 0,
  lists: 0,
  reviews: 0,
  watched: 0,
  watchlist: 0,
});

export interface Favorite {
  posterPath: string | null;
  title: string;
  tmdbId: number;
  year: number | null;
}

export function releaseYear(value: string | null | undefined): number | null {
  const year = Number(value?.slice(0, 4));
  return Number.isInteger(year) && year > 0 ? year : null;
}
