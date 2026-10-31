interface SpotlightFilm {
  backdropPath: string | null;
  genres: string[];
  id: number;
  posterPath: string;
  title: string;
  year: number | null;
}

/** A Best Picture winner, by the ceremony that crowned it. */
export interface Laureate extends SpotlightFilm {
  ceremony: number;
  /** The year the ceremony was held. */
  ceremonyYear: number;
  director: string | null;
  /** The film year the Academy honoured (1927 for Wings). */
  honoured: number;
  logline: string | null;
  runtime: number | null;
  tagline: string | null;
}

/** One film of the IMDb Top 100, in IMDb's order. */
export interface CanonFilm extends SpotlightFilm {
  rank: number;
  rating: number | null;
  votes: number;
}

/** The most films a director's portrait is drawn from. */
export const MAX_FILMS = 64;

/** One film a director made; the portrait is drawn from all of them. */
export interface DirectorFilm {
  id: number;
  posterPath: string;
  title: string;
  year: number | null;
}

export interface Director {
  born: number;
  died: number | null;
  /** Every film they directed that people know, oldest first. */
  films: DirectorFilm[];
  id: number;
  name: string;
  place: string | null;
  profilePath: string;
  rank: number;
}
