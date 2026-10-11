export interface HomeMovie {
  backdropPath: string | null;
  genres: string[];
  id: number;
  posterPath: string | null;
  releaseDate: string | null;
  title: string;
  year: number | null;
}

export interface TrendingMovie extends HomeMovie {
  backdropPath: string;
  logline: string | null;
}

export interface PulseMovie extends HomeMovie {
  likers: number;
  listers: number;
  reviewers: number;
  watchers: number;
}

export interface HomeFeed {
  soon: HomeMovie[];
  theatres: HomeMovie[];
  // The day the feed was cut, as an ISO date.
  today: string;
  trending: TrendingMovie[];
  // The seven days the chart covers, as ISO dates.
  week: { from: string; to: string };
}

export interface DiscoverResponse {
  hasMore: boolean;
  movies: HomeMovie[];
  page: number;
}
