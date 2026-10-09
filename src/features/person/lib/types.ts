export interface FilmographyCredit {
  id: number;
  key: string;
  popularity: number;
  posterPath: string | null;
  releaseDate: string | null;
  role: string | null;
  title: string;
  voteCount: number;
  year: number | null;
}

export type FilmographySort = "popularity" | "newest" | "oldest" | "name";

export interface FilmographyGroup {
  credits: FilmographyCredit[];
  key: string;
  label: string;
  total: number;
}

export interface TimelineCredit {
  detail: string | null;
  id: number;
  key: string;
  posterPath: string | null;
  title: string;
}

export interface TimelineYear {
  credits: TimelineCredit[];
  year: string | null;
}

export interface SocialLink {
  icon: string;
  key: string;
  label: string;
  url: string;
}

export type PersonViewKey = "main" | "timeline" | "awards";

export interface CareerYear {
  count: number;
  films: string[];
  weight: number;
  year: number;
}

export interface Career {
  peak: number;
  years: CareerYear[];
}

export interface AwardTotals {
  nominations: number;
  wins: number;
}
