import { z } from "zod";
import { isFilmTitle } from "../filters";
import {
  calendarDate,
  countOrZero,
  genreIds,
  lenientList,
  positiveOrNull,
  text,
  timestamp,
  yearOf,
} from "./common";

const id = z.number().int().positive();

const genre = z.object({ id, name: z.string() });

const company = z
  .object({
    id,
    name: z.string(),
    logo_path: text,
    origin_country: text,
  })
  .transform((c) => ({
    id: c.id,
    name: c.name,
    logoPath: c.logo_path,
    originCountry: c.origin_country,
  }));

const country = z
  .object({ iso_3166_1: z.string().length(2), name: z.string() })
  .transform((c) => ({ code: c.iso_3166_1, name: c.name }));

const language = z
  .object({
    iso_639_1: z.string().min(2),
    name: z.string(),
    english_name: z.string(),
  })
  .transform((l) => ({
    code: l.iso_639_1,
    name: l.name,
    englishName: l.english_name,
  }));

const collection = z
  .object({
    id,
    name: z.string(),
    poster_path: text,
    backdrop_path: text,
  })
  .transform((c) => ({
    id: c.id,
    name: c.name,
    posterPath: c.poster_path,
    backdropPath: c.backdrop_path,
  }));

const castMember = z
  .object({
    id,
    credit_id: z.string(),
    name: z.string(),
    character: text,
    order: z.number().int().nonnegative().nullish(),
    profile_path: text,
  })
  .transform((c) => ({
    id: c.id,
    creditId: c.credit_id,
    name: c.name,
    character: c.character,
    order: c.order ?? Number.MAX_SAFE_INTEGER,
    profilePath: c.profile_path,
  }));

const crewMember = z
  .object({
    id,
    credit_id: z.string(),
    name: z.string(),
    job: text,
    department: text,
    profile_path: text,
  })
  .transform((c) => ({
    id: c.id,
    creditId: c.credit_id,
    name: c.name,
    job: c.job,
    department: c.department,
    profilePath: c.profile_path,
  }));

export const imageSchema = z
  .object({
    file_path: z.string().min(1),
    width: z.number().positive(),
    height: z.number().positive(),
    iso_639_1: text,
    vote_average: countOrZero,
    vote_count: countOrZero,
  })
  .transform((i) => ({
    filePath: i.file_path,
    width: i.width,
    height: i.height,
    aspectRatio: i.width / i.height,
    language: i.iso_639_1,
    voteAverage: i.vote_average,
    voteCount: i.vote_count,
  }));

const video = z
  .object({
    id: z.string(),
    key: z.string().min(1),
    name: z.string(),
    site: z.string(),
    type: z.string(),
    official: z.boolean().nullish(),
    iso_639_1: text,
    published_at: timestamp,
  })
  .transform((v) => ({
    id: v.id,
    key: v.key,
    name: v.name,
    site: v.site,
    type: v.type,
    official: v.official ?? false,
    language: v.iso_639_1,
    publishedAt: v.published_at,
  }));

const release = z
  .object({
    certification: text,
    release_date: timestamp,
    type: z.number().int().min(1).max(6),
    iso_639_1: text,
    note: text,
  })
  .transform((r) => ({
    certification: r.certification,
    releaseDate: r.release_date,
    type: r.type,
    language: r.iso_639_1,
    note: r.note,
  }));

const regionalReleases = z
  .object({
    iso_3166_1: z.string().length(2),
    release_dates: lenientList(release),
  })
  .transform((r) => ({ region: r.iso_3166_1, releases: r.release_dates }));

export const movieSummarySchema = z
  .object({
    id,
    title: z.string(),
    original_title: text,
    release_date: calendarDate,
    poster_path: text,
    backdrop_path: text,
    vote_average: countOrZero,
    vote_count: countOrZero,
    genre_ids: genreIds,
    video: z.boolean().nullish(),
  })
  .transform((m) => ({
    id: m.id,
    title: m.title,
    originalTitle: m.original_title,
    releaseDate: m.release_date,
    releaseYear: yearOf(m.release_date),
    posterPath: m.poster_path,
    backdropPath: m.backdrop_path,
    voteAverage: m.vote_average,
    voteCount: m.vote_count,
    genreIds: m.genre_ids,
    video: m.video ?? false,
  }))
  .refine(isFilmTitle, "Not a film");

const provider = z
  .object({
    provider_id: z.number().int(),
    provider_name: z.string(),
    logo_path: text,
    display_priority: z.number().nullish(),
  })
  .transform((p) => ({
    providerId: p.provider_id,
    name: p.provider_name,
    logoPath: p.logo_path,
    displayPriority: p.display_priority ?? Number.MAX_SAFE_INTEGER,
  }));

const regionalProviders = z
  .object({
    link: text,
    flatrate: lenientList(provider),
    rent: lenientList(provider),
    buy: lenientList(provider),
    ads: lenientList(provider),
    free: lenientList(provider),
  })
  .transform((r) => ({
    link: r.link,
    flatrate: r.flatrate,
    rent: r.rent,
    buy: r.buy,
    ads: r.ads,
    free: r.free,
  }));

const providersByRegion = z
  .record(z.string(), z.unknown())
  .nullish()
  .transform((record) => {
    const result: Record<string, z.output<typeof regionalProviders>> = {};
    for (const [region, value] of Object.entries(record ?? {})) {
      const parsed = regionalProviders.safeParse(value);
      if (parsed.success) result[region] = parsed.data;
    }
    return result;
  });

const externalIds = z
  .object({
    imdb_id: text,
    wikidata_id: text,
    facebook_id: text,
    instagram_id: text,
    twitter_id: text,
  })
  .partial()
  .transform((e) => ({
    imdbId: e.imdb_id ?? null,
    wikidataId: e.wikidata_id ?? null,
    facebookId: e.facebook_id ?? null,
    instagramId: e.instagram_id ?? null,
    twitterId: e.twitter_id ?? null,
  }));

const MOVIE_STATUSES = [
  "Rumored",
  "Planned",
  "In Production",
  "Post Production",
  "Released",
  "Canceled",
  "Unknown",
] as const;

const emptyExternalIds = externalIds.parse({});

export const movieDetailsSchema = z
  .object({
    id,
    title: z.string(),
    original_title: text,
    original_language: text,
    tagline: text,
    overview: text,
    status: z.enum(MOVIE_STATUSES).catch("Unknown"),
    release_date: calendarDate,
    runtime: positiveOrNull,
    budget: positiveOrNull,
    revenue: positiveOrNull,
    adult: z.boolean().nullish(),
    vote_average: countOrZero,
    vote_count: countOrZero,
    popularity: countOrZero,
    poster_path: text,
    backdrop_path: text,
    homepage: text,
    imdb_id: text,
    genres: lenientList(genre),
    production_companies: lenientList(company),
    production_countries: lenientList(country),
    spoken_languages: lenientList(language),
    belongs_to_collection: collection.nullish().catch(null),
    credits: z
      .object({ cast: lenientList(castMember), crew: lenientList(crewMember) })
      .nullish(),
    images: z
      .object({
        backdrops: lenientList(imageSchema),
        posters: lenientList(imageSchema),
        logos: lenientList(imageSchema),
      })
      .nullish(),
    videos: z.object({ results: lenientList(video) }).nullish(),
    release_dates: z
      .object({ results: lenientList(regionalReleases) })
      .nullish(),
    recommendations: z
      .object({ results: lenientList(movieSummarySchema) })
      .nullish(),
    "watch/providers": z.object({ results: providersByRegion }).nullish(),
    external_ids: externalIds.nullish(),
    keywords: z.object({ keywords: lenientList(genre) }).nullish(),
  })
  .transform((m) => ({
    id: m.id,
    title: m.title,
    originalTitle: m.original_title,
    originalLanguage: m.original_language,
    tagline: m.tagline,
    overview: m.overview,
    status: m.status,
    releaseDate: m.release_date,
    releaseYear: yearOf(m.release_date),
    runtimeMinutes: m.runtime,
    budget: m.budget,
    revenue: m.revenue,
    adult: m.adult ?? false,
    voteAverage: m.vote_average,
    voteCount: m.vote_count,
    popularity: m.popularity,
    posterPath: m.poster_path,
    backdropPath: m.backdrop_path,
    homepage: m.homepage,
    imdbId: m.imdb_id ?? m.external_ids?.imdbId ?? null,
    genres: m.genres,
    productionCompanies: m.production_companies,
    productionCountries: m.production_countries,
    spokenLanguages: m.spoken_languages,
    collection: m.belongs_to_collection ?? null,
    credits: m.credits ?? { cast: [], crew: [] },
    images: m.images ?? { backdrops: [], posters: [], logos: [] },
    videos: m.videos?.results ?? [],
    releaseDates: m.release_dates?.results ?? [],
    recommendations: m.recommendations?.results ?? [],
    watchProviders: m["watch/providers"]?.results ?? {},
    externalIds: m.external_ids ?? emptyExternalIds,
    keywords: m.keywords?.keywords ?? [],
  }));
