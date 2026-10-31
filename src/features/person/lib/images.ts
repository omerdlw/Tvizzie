import type {
  PersonCastCredit,
  PersonCrewCredit,
  PersonDetails,
  PersonImage,
} from "@/infrastructure/tmdb/types";
import { tmdbImageUrl } from "@/infrastructure/tmdb/images";
import {
  PERSON_BACKDROP_LIMIT,
  PERSON_BACKDROP_MIN_VOTES,
  PERSON_GALLERY_LIMIT,
} from "./constants";
import type { Credit } from "./credits";

const NOT_A_REAL_ROLE = /uncredited|cameo|self|archive/i;

function backdropScore(credit: Credit, kind: "cast" | "crew"): number {
  let weight = 1;
  if (kind === "cast") {
    const { order, character } = credit as PersonCastCredit;
    weight = order === 0 ? 1.6 : order <= 2 ? 1.3 : order <= 5 ? 1 : 0.7;
    if (order > 10) weight = 0.3;
    if (character && NOT_A_REAL_ROLE.test(character)) weight *= 0.2;
  } else {
    weight = (credit as PersonCrewCredit).job === "Director" ? 1.3 : 0.5;
  }
  const impact =
    Math.log10(Math.max(1, credit.voteCount)) * 25 +
    Math.log10(Math.max(1, credit.popularity)) * 10;
  return impact * weight;
}

export function getBackdropPaths(
  person: PersonDetails,
  limit = PERSON_BACKDROP_LIMIT,
): string[] {
  const best = new Map<number, { path: string; score: number }>();
  const consider = (credit: Credit, kind: "cast" | "crew") => {
    if (!credit.backdropPath || credit.voteCount < PERSON_BACKDROP_MIN_VOTES) {
      return;
    }
    const score = backdropScore(credit, kind);
    const known = best.get(credit.id);
    if (!known || score > known.score) {
      best.set(credit.id, { path: credit.backdropPath, score });
    }
  };
  person.credits.cast.forEach((credit) => consider(credit, "cast"));
  person.credits.crew.forEach((credit) => consider(credit, "crew"));

  return [...best.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ path }) => path);
}

export function getBackdropPath(person: PersonDetails): string | null {
  return getBackdropPaths(person, 1)[0] ?? null;
}

export function personSwatch(
  backdropPath: string | null,
  photoPath: string | null,
): string | null {
  return (
    tmdbImageUrl("backdrop", backdropPath, "w300") ??
    tmdbImageUrl("profile", photoPath, "w185")
  );
}

export function getGalleryImages(
  person: PersonDetails,
  limit = PERSON_GALLERY_LIMIT,
): PersonImage[] {
  return [...person.images.profiles]
    .sort((a, b) => b.voteAverage - a.voteAverage || b.voteCount - a.voteCount)
    .slice(0, limit);
}
