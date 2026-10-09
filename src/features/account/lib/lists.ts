export interface MovieListSummary {
  description?: string | null;
  id: string;
  isPrivate: boolean;
  itemsCount: number;
  posterPath: string | null;
  previewPosters?: (string | null)[];
  title: string;
}

export type MovieListsResult =
  | { lists: MovieListSummary[]; memberships: string[]; success: true }
  | { error: string; success: false };

export type MovieListChangeResult =
  | { inList: boolean; list: MovieListSummary; success: true }
  | { error: string; success: false };

export const LIST_TITLE_MAX = 120;

export const isListId = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
