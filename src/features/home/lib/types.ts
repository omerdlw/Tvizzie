export interface HomeMovie {
  backdropPath: string | null;
  genres: string[];
  id: number;
  posterPath: string | null;
  releaseDate: string | null;
  title: string;
  year: number | null;
}

export interface ShowingMovie extends HomeMovie {
  logline: string | null;
}

export interface TrendingMovie extends ShowingMovie {
  backdropPath: string;
}

export interface CanonMovie extends HomeMovie {
  // Place on the IMDb chart, from 1.
  rank: number;
  // TMDB's average, out of ten, when it has one.
  rating: number | null;
}

export interface LaureateMovie extends HomeMovie {
  // The ceremony that crowned it, counted from the first, in 1929.
  ceremony: number;
  // The year that ceremony was held.
  ceremonyYear: number;
}

export interface Director {
  born: number;
  died: number | null;
  films: HomeMovie[];
  // TMDB's id for the person.
  id: number;
  name: string;
  profilePath: string | null;
  // Place among the most successful directors, from 1.
  rank: number;
}

export interface PulseMovie extends HomeMovie {
  likers: number;
  listers: number;
  reviewers: number;
  watchers: number;
}

export interface HomeFeed {
  canon: CanonMovie[];
  directors: Director[];
  laureates: LaureateMovie[];
  soon: ShowingMovie[];
  theatres: ShowingMovie[];
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
