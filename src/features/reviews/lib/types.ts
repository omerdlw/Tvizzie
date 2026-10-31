export interface ReviewInput {
  content: string;
  isSpoiler: boolean;
  rating: number | null;
}

export interface MovieReview {
  author: {
    avatarUrl: string | null;
    displayName: string;
    id: string;
    username: string;
  };
  /** The author liked the film itself, not only reviewed it. */
  authorLiked: boolean;
  content: string;
  createdAt: string;
  id: string;
  isSpoiler: boolean;
  liked: boolean;
  likesCount: number;
  rating: number | null;
  updatedAt: string;
}

export interface ReviewStats {
  average: number | null;
  rated: number;
  total: number;
}

export type { MutationResult as ReviewResult } from "@/features/auth/server";
