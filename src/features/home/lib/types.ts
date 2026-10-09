export interface HomeMovie {
  backdropPath: string | null;
  genres: string[];
  id: number;
  posterPath: string | null;
  releaseDate: string | null;
  title: string;
  year: number | null;
}

export interface ReelMovie extends HomeMovie {
  note: string;
}

export interface PulseMovie extends HomeMovie {
  likers: number;
  listers: number;
  reviewers: number;
  watchers: number;
}

export interface HomePerson {
  id: number;
  name: string;
}

export interface HomeFeed {
  discover: HomeMovie[];
  names: HomePerson[];
  reel: ReelMovie[];
  pulse: PulseMovie[];
  soon: HomeMovie[];
  theatres: HomeMovie[];
}

export interface DiscoverResponse {
  hasMore: boolean;
  movies: HomeMovie[];
  page: number;
}

export interface HomeList {
  description: string;
  id: string;
  itemsCount: number;
  likesCount: number;
  owner: { displayName: string; username: string };
  previews: (string | null)[];
  reviewsCount: number;
  slug: string;
  title: string;
  updatedAt: string;
}

export interface HomeReview {
  author: { avatarUrl: string | null; displayName: string; username: string };
  excerpt: string;
  id: string;
  likesCount: number;
  posterPath: string | null;
  title: string;
  tmdbId: number;
  year: number | null;
}

export interface CommunityPicks {
  lists: HomeList[];
  reviews: HomeReview[];
}

export interface HomeCommunity {
  following: CommunityPicks | null;
  everyone: CommunityPicks;
}
