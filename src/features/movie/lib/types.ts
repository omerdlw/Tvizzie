export interface PersonEntry {
  id: number;
  key: string;
  name: string;
  profilePath: string | null;
  subtitle: string;
}

// What the community did with a film, from film_stats.
export interface FilmStats {
  liked: number;
  listed: number;
  /** Ratings per half-star: [0] is ½★, [9] is ★★★★★. */
  ratings: number[];
  reviews: number;
  watched: number;
  watchlist: number;
}

// A public list the film appears in, for the film page's popular lists.
export interface PopularList {
  description: string;
  id: string;
  itemsCount: number;
  likesCount: number;
  owner: { avatarUrl: string | null; displayName: string; username: string };
  previews: (string | null)[];
  reviewsCount: number;
  slug: string;
  title: string;
}
