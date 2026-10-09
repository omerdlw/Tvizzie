import { z } from "zod";
import { isActingCredit, isCrewCredit } from "../filters";
import {
  calendarDate,
  countOrZero,
  genreIds,
  lenientList,
  text,
  yearOf,
} from "./common";
import { imageSchema } from "./movie";

const id = z.number().int().positive();

export const personSummarySchema = z
  .object({
    id,
    name: z.string().trim().min(1),
    known_for_department: text,
    profile_path: text,
    popularity: countOrZero,
  })
  .transform((p) => ({
    id: p.id,
    name: p.name,
    knownForDepartment: p.known_for_department,
    profilePath: p.profile_path,
    popularity: p.popularity,
  }));

const externalIds = z
  .object({
    imdb_id: text,
    wikidata_id: text,
    facebook_id: text,
    instagram_id: text,
    twitter_id: text,
    tiktok_id: text,
    youtube_id: text,
  })
  .partial()
  .transform((e) => ({
    imdbId: e.imdb_id ?? null,
    wikidataId: e.wikidata_id ?? null,
    facebookId: e.facebook_id ?? null,
    instagramId: e.instagram_id ?? null,
    twitterId: e.twitter_id ?? null,
    tiktokId: e.tiktok_id ?? null,
    youtubeId: e.youtube_id ?? null,
  }));

const emptyExternalIds = externalIds.parse({});

const creditBase = {
  id,
  credit_id: z.string(),
  title: z.string(),
  original_title: text,
  release_date: calendarDate,
  poster_path: text,
  backdrop_path: text,
  vote_average: countOrZero,
  vote_count: countOrZero,
  popularity: countOrZero,
  adult: z.boolean().nullish(),
  genre_ids: genreIds,
  video: z.boolean().nullish(),
};

function movieOf(c: {
  id: number;
  credit_id: string;
  title: string;
  original_title: string | null;
  release_date: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  adult?: boolean | null;
  genre_ids: number[];
  video?: boolean | null;
}) {
  return {
    id: c.id,
    creditId: c.credit_id,
    title: c.title,
    originalTitle: c.original_title,
    releaseDate: c.release_date,
    releaseYear: yearOf(c.release_date),
    posterPath: c.poster_path,
    backdropPath: c.backdrop_path,
    voteAverage: c.vote_average,
    voteCount: c.vote_count,
    popularity: c.popularity,
    adult: c.adult ?? false,
    genreIds: c.genre_ids,
    video: c.video ?? false,
  };
}

const castCredit = z
  .object({
    ...creditBase,
    character: text,
    order: z.number().int().nonnegative().nullish(),
  })
  .transform((c) => ({
    ...movieOf(c),
    character: c.character,
    order: c.order ?? Number.MAX_SAFE_INTEGER,
  }));

const crewCredit = z
  .object({ ...creditBase, job: text, department: text })
  .transform((c) => ({
    ...movieOf(c),
    job: c.job,
    department: c.department,
  }));

export const personDetailsSchema = z
  .object({
    id,
    name: z.string().trim().min(1),
    also_known_as: z.array(z.string()).nullish(),
    biography: text,
    birthday: calendarDate,
    deathday: calendarDate,
    place_of_birth: text,
    known_for_department: text,
    gender: z.number().int().nullish(),
    profile_path: text,
    popularity: countOrZero,
    homepage: text,
    imdb_id: text,
    movie_credits: z
      .object({ cast: lenientList(castCredit), crew: lenientList(crewCredit) })
      .nullish(),
    images: z.object({ profiles: lenientList(imageSchema) }).nullish(),
    external_ids: externalIds.nullish(),
  })
  .transform((p) => ({
    id: p.id,
    name: p.name,
    alsoKnownAs: [
      ...new Set(
        (p.also_known_as ?? []).map((name) => name.trim()).filter(Boolean),
      ),
    ],
    biography: p.biography,
    birthday: p.birthday,
    deathday: p.deathday,
    placeOfBirth: p.place_of_birth,
    knownForDepartment: p.known_for_department,
    gender: p.gender ?? 0,
    profilePath: p.profile_path,
    popularity: p.popularity,
    homepage: p.homepage,
    credits: {
      cast: (p.movie_credits?.cast ?? []).filter(
        (c) => !c.adult && isActingCredit(c),
      ),
      crew: (p.movie_credits?.crew ?? []).filter(
        (c) => !c.adult && isCrewCredit(c),
      ),
    },
    images: { profiles: p.images?.profiles ?? [] },
    externalIds: {
      ...(p.external_ids ?? emptyExternalIds),
      imdbId: p.imdb_id ?? p.external_ids?.imdbId ?? null,
    },
  }));
