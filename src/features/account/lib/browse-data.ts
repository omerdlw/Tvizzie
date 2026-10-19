export interface Paged<T> {
  items: T[];
  page: number;
  pageCount: number;
  total: number;
}

export interface MediaItem {
  pinned: boolean;
  posterPath: string | null;
  title: string;
  tmdbId: number;
  year: number | null;
}

export interface ListCardData {
  description: string;
  id: string;
  isPrivate: boolean;
  isRanked: boolean;
  itemsCount: number;
  likesCount: number;
  previews: (string | null)[];
  reviewsCount: number;
  slug: string;
  title: string;
  updatedAt: string;
}

export interface ReviewCardData {
  backdropPath: string | null;
  content: string;
  createdAt: string;
  id: string;
  isSpoiler: boolean;
  liked: boolean;
  likesCount: number;
  posterPath: string | null;
  rating: number | null;
  title: string;
  tmdbId: number;
  updatedAt: string;
  year: number | null;
}

export interface ActivityItem {
  createdAt: string;
  id: string;
  list: { slug: string; title: string } | null;
  listOwner: string | null;
  posterPath: string | null;
  rating: number | null;
  target: { displayName: string; username: string } | null;
  title: string | null;
  tmdbId: number | null;
  type: string;
}

export interface DiaryRow {
  hasReview: boolean;
  id: string;
  isRewatch: boolean;
  posterPath: string | null;
  rating: number | null;
  title: string;
  tmdbId: number;
  watchedOn: string;
  year: number | null;
}

export interface DiaryEntry {
  id: string;
  title: string;
  tmdbId: number;
  watchedOn: string;
}

export interface PersonPreview {
  avatarUrl: string | null;
  displayName: string;
  username: string;
}

export interface DiaryMonth {
  first: string | null;
  last: string | null;
  month: string;
  rows: DiaryRow[];
}

export interface ListDetail {
  description: string;
  id: string;
  isPrivate: boolean;
  isRanked: boolean;
  itemsCount: number;
  liked: boolean;
  likesCount: number;
  owner: { displayName: string; id: string; username: string };
  // The first film's poster, which stands for the list.
  posterPath: string | null;
  reviewsCount: number;
  slug: string;
  title: string;
  updatedAt: string;
}

export interface ListComment {
  author: {
    avatarUrl: string | null;
    displayName: string;
    id: string;
    username: string;
  };
  content: string;
  createdAt: string;
  id: string;
  liked: boolean;
  likesCount: number;
}

export type ActionResult<T extends object = object> =
  ({ success: true } & T) | { error: string; success: false };

export interface ListInput {
  description: string;
  isPrivate: boolean;
  isRanked: boolean;
  title: string;
}

export const LIST_DESCRIPTION_MAX = 2000;
export const FAVORITES_MAX = 5;
