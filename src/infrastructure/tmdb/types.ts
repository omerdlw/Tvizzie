import type { z } from "zod";
import type { movieDetailsSchema } from "./schemas/movie";
import type { personDetailsSchema } from "./schemas/person";
import type { featuredMoviePageSchema } from "./schemas/discover";
import type {
  movieSearchPageSchema,
  personSearchPageSchema,
} from "./schemas/search";

export type MovieDetails = z.output<typeof movieDetailsSchema>;
export type MovieSearchPage = z.output<typeof movieSearchPageSchema>;

export type FeaturedMoviePage = z.output<typeof featuredMoviePageSchema>;
export type FeaturedMovie = FeaturedMoviePage["results"][number];

export type PersonSearchPage = z.output<typeof personSearchPageSchema>;

export type PersonDetails = z.output<typeof personDetailsSchema>;
export type PersonCastCredit = PersonDetails["credits"]["cast"][number];
export type PersonCrewCredit = PersonDetails["credits"]["crew"][number];
export type PersonImage = PersonDetails["images"]["profiles"][number];
export type PersonExternalIds = PersonDetails["externalIds"];

export type MovieImage = MovieDetails["images"]["posters"][number];
export type MovieVideo = MovieDetails["videos"][number];

export type { TmdbError } from "./errors";

export interface AwardRecipient {
  id: number;
  name: string;
  profilePath: string | null;
}

export interface Award {
  category: string;
  ceremony: string;
  mediaType: "movie" | "tv" | null;
  posterPath: string | null;
  project: string | null;
  projectId: number | null;
  recipients: AwardRecipient[];
  won: boolean;
  year: string | null;
}

export interface AwardOrganization {
  awards: Award[];
  id: string;
  logoPath: string | null;
  title: string;
}

export interface Awards {
  nominations: number;
  organizations: AwardOrganization[];
  wins: number;
}
