export const TRENDING_LENGTH = 10;
export const SHOWING_LENGTH = 10;
export const DISCOVER_PAGE_SIZE = 12;
export const PULSE_LENGTH = 9;
export const PULSE_MINIMUM = 4;

export const GENRE_LABELS: Readonly<Record<number, string>> = {
  12: "Adventure",
  14: "Fantasy",
  16: "Animation",
  18: "Drama",
  27: "Horror",
  28: "Action",
  35: "Comedy",
  36: "History",
  37: "Western",
  53: "Thriller",
  80: "Crime",
  99: "Documentary",
  878: "Sci-Fi",
  9648: "Mystery",
  10402: "Music",
  10749: "Romance",
  10751: "Family",
  10752: "War",
  10770: "TV Movie",
};

export const DISCOVER_GENRES: readonly { id: number; label: string }[] = [
  { id: 28, label: "Action" },
  { id: 12, label: "Adventure" },
  { id: 16, label: "Animation" },
  { id: 35, label: "Comedy" },
  { id: 80, label: "Crime" },
  { id: 99, label: "Documentary" },
  { id: 18, label: "Drama" },
  { id: 10751, label: "Family" },
  { id: 14, label: "Fantasy" },
  { id: 36, label: "History" },
  { id: 27, label: "Horror" },
  { id: 9648, label: "Mystery" },
  { id: 10749, label: "Romance" },
  { id: 878, label: "Sci-Fi" },
  { id: 53, label: "Thriller" },
  { id: 10752, label: "War" },
  { id: 37, label: "Western" },
];

export const DISCOVER_DECADES: readonly {
  label: string;
  value: number | null;
}[] = [
  { label: "any year", value: null },
  { label: "the 2020s", value: 2020 },
  { label: "the 2010s", value: 2010 },
  { label: "the 2000s", value: 2000 },
  { label: "the 1990s", value: 1990 },
  { label: "the 1980s", value: 1980 },
  { label: "the 1970s", value: 1970 },
  { label: "the 1960s", value: 1960 },
];

export const DISCOVER_SORT_OPTIONS = [
  { label: "most popular", value: "popularity.desc" },
  { label: "most watched", value: "vote_count.desc" },
  { label: "newest", value: "primary_release_date.desc" },
  { label: "oldest", value: "primary_release_date.asc" },
] as const;

export const DISCOVER_ENDPOINT = "/api/discover/movies";

export const TMDB_ATTRIBUTION =
  "This product uses the TMDB API but is not endorsed or certified by TMDB.";
