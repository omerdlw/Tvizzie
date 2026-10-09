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

export type ReviewResult<T extends object = object> =
  ({ success: true } & T) | { error: string; success: false };
