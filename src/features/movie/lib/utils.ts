import type { MovieDetails } from "@/infrastructure/tmdb/types";
import {
  MOVIE_CERTIFICATION_REGION,
  MOVIE_GALLERY_LIMIT,
  MOVIE_RECOMMENDATION_LIMIT,
  MOVIE_TAG_LIMIT,
  MOVIE_TAG_MAX_LENGTH,
  MOVIE_WRITER_LIMIT,
} from "./constants";

const WRITING_JOBS: ReadonlySet<string> = new Set([
  "Screenplay",
  "Writer",
  "Story",
  "Novel",
  "Author",
]);

const DOCK_DIRECTOR_LIMIT = 2;

const RELEASE_TYPE_PRIORITY = [3, 2, 4, 5, 6, 1];

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "UTC",
});
const moneyFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
  notation: "compact",
  style: "currency",
});

export { movieHref } from "@/config/routes";

export function parseMovieId(raw: string): number | null {
  return /^[1-9]\d{0,9}$/.test(raw) ? Number(raw) : null;
}

function formatRuntime(minutes: number | null): string | null {
  if (!minutes || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export function formatReleaseDate(date: string | null): string | null {
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : dateFormatter.format(parsed);
}

export function formatMoney(amount: number | null): string | null {
  return amount ? moneyFormatter.format(amount) : null;
}

function uniqueById<T extends { id: number }>(items: readonly T[]): T[] {
  const seen = new Set<number>();
  return items.filter((item) => !seen.has(item.id) && !!seen.add(item.id));
}

function getDirectors(movie: MovieDetails) {
  return uniqueById(movie.credits.crew.filter((c) => c.job === "Director"));
}

export function getWriters(movie: MovieDetails, limit = MOVIE_WRITER_LIMIT) {
  return uniqueById(
    movie.credits.crew.filter(
      (c) => c.department === "Writing" && c.job && WRITING_JOBS.has(c.job),
    ),
  ).slice(0, limit);
}

export function getCast(movie: MovieDetails) {
  return uniqueById([...movie.credits.cast].sort((a, b) => a.order - b.order));
}

const CREW_JOB_PRIORITY = [
  "Director",
  "Screenplay",
  "Writer",
  "Story",
  "Producer",
  "Executive Producer",
  "Director of Photography",
  "Original Music Composer",
  "Editor",
  "Production Design",
  "Costume Design",
];

interface MovieCrewEntry {
  creditId: string;
  department: string | null;
  id: number;
  jobs: string;
  name: string;
  profilePath: string | null;
}

export function getCrew(movie: MovieDetails): MovieCrewEntry[] {
  const people = new Map<number, MovieCrewEntry & { rank: number }>();
  const rankOf = (job: string | null) => {
    const index = job ? CREW_JOB_PRIORITY.indexOf(job) : -1;
    return index === -1 ? CREW_JOB_PRIORITY.length : index;
  };

  for (const member of movie.credits.crew) {
    if (!member.job) continue;
    const existing = people.get(member.id);
    if (!existing) {
      people.set(member.id, {
        creditId: member.creditId,
        department: member.department,
        id: member.id,
        jobs: member.job,
        name: member.name,
        profilePath: member.profilePath,
        rank: rankOf(member.job),
      });
    } else {
      if (!existing.jobs.split(" / ").includes(member.job)) {
        existing.jobs = `${existing.jobs} / ${member.job}`;
      }
      existing.rank = Math.min(existing.rank, rankOf(member.job));
    }
  }

  return [...people.values()]
    .sort((a, b) => a.rank - b.rank)
    .map(({ rank: _rank, ...entry }) => entry);
}

export function getTags(movie: MovieDetails, limit = MOVIE_TAG_LIMIT) {
  const genres = new Set(movie.genres.map((g) => g.name.toLowerCase()));
  const seen = new Set<string>();
  return movie.keywords
    .map((keyword) => keyword.name.trim())
    .filter((name) => {
      const key = name.toLowerCase();
      if (!name || name.length > MOVIE_TAG_MAX_LENGTH) return false;
      if (genres.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

export function getGalleryImages(
  movie: MovieDetails,
  limit = MOVIE_GALLERY_LIMIT,
) {
  return movie.images.backdrops
    .filter((image) => !image.language)
    .sort((a, b) => b.voteAverage - a.voteAverage || b.voteCount - a.voteCount)
    .slice(0, limit);
}

export function getPaletteImages(movie: MovieDetails, limit = 36) {
  return movie.images.backdrops
    .filter((image) => !image.language)
    .slice(0, limit);
}

export function getPosterImages(
  movie: MovieDetails,
  limit = MOVIE_GALLERY_LIMIT,
) {
  return [...movie.images.posters]
    .sort((a, b) => b.voteAverage - a.voteAverage || b.voteCount - a.voteCount)
    .slice(0, limit);
}

export function getVideoTypes(movie: MovieDetails): string[] {
  return [
    ...new Set(
      movie.videos.filter((v) => v.site === "YouTube").map((v) => v.type),
    ),
  ];
}

export function getOriginalLanguageName(movie: MovieDetails): string | null {
  return (
    movie.spokenLanguages.find((l) => l.code === movie.originalLanguage)
      ?.englishName ?? movie.originalLanguage
  );
}

export function getRecommendations(
  movie: MovieDetails,
  limit = MOVIE_RECOMMENDATION_LIMIT,
) {
  return movie.recommendations.filter((m) => m.id !== movie.id).slice(0, limit);
}

export function getCertification(
  movie: MovieDetails,
  region: string = MOVIE_CERTIFICATION_REGION,
): string | null {
  const releases =
    movie.releaseDates.find((r) => r.region === region)?.releases ?? [];
  const rank = (type: number) => {
    const index = RELEASE_TYPE_PRIORITY.indexOf(type);
    return index === -1 ? RELEASE_TYPE_PRIORITY.length : index;
  };
  return (
    [...releases]
      .filter((r) => r.certification)
      .sort((a, b) => rank(a.type) - rank(b.type))[0]?.certification ?? null
  );
}

export function describeMovie(movie: MovieDetails): string {
  const directors = getDirectors(movie)
    .slice(0, DOCK_DIRECTOR_LIMIT)
    .map((director) => director.name)
    .join(", ");
  return [
    directors && `by ${directors}`,
    movie.releaseYear,
    formatRuntime(movie.runtimeMinutes),
  ]
    .filter(Boolean)
    .join(" · ");
}
