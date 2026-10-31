export interface SocialPerson {
  avatarUrl: string | null;
  displayName: string;
  id: string;
  username: string;
}

export interface Friend extends SocialPerson {
  liked: boolean;
  rating: number | null;
  reviewed: boolean;
  watched: boolean;
  watchlisted: boolean;
}

export interface MovieSocialProof {
  averageRating: number | null;
  counts: {
    liked: number;
    ratings: number;
    reviews: number;
    watched: number;
    watchlist: number;
  };
  friends: Friend[];
  total: number;
}

export interface MutualFollowers {
  people: SocialPerson[];
  total: number;
}

export type SocialResult<T extends object> =
  ({ success: true } & T) | { error: string; success: false };
