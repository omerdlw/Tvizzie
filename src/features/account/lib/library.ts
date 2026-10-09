export const MOVIE_LIBRARY_KINDS = ["liked", "watched", "watchlist"] as const;

export type MovieLibraryKind = (typeof MOVIE_LIBRARY_KINDS)[number];

export interface MovieLibraryState {
  liked: boolean;
  watched: boolean;
  watchlist: boolean;
}

export type MovieLibraryResult =
  | { state: MovieLibraryState; success: true }
  | { error: string; success: false };

export const EMPTY_MOVIE_LIBRARY: MovieLibraryState = Object.freeze({
  liked: false,
  watched: false,
  watchlist: false,
});

export function isMovieLibraryKind(value: unknown): value is MovieLibraryKind {
  return (MOVIE_LIBRARY_KINDS as readonly unknown[]).includes(value);
}

export function applyMovieLibraryChange(
  state: MovieLibraryState,
  kind: MovieLibraryKind,
  active: boolean,
): MovieLibraryState {
  const next = { ...state, [kind]: active };
  if (kind === "watched") {
    if (active) next.watchlist = false;
    else next.liked = false;
  }
  return next;
}

export type DiaryLogResult =
  { success: true } | { error: string; success: false };

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDiaryDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = ISO_DAY.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function localDiaryDate(now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
