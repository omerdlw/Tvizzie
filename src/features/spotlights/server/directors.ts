import "server-only";

import { cache } from "react";
import { report } from "@omerdlw/base-framework/utils";
import { getPersonDetails } from "@/infrastructure/tmdb/server";
import type { PersonCrewCredit } from "@/infrastructure/tmdb/types";
import { DIRECTORS } from "../data/directors";
import { MAX_FILMS, type Director, type DirectorFilm } from "../lib/types";
import { batched, kept } from "./keep";

// TMDB lists every credit, down to student shorts and stray duplicates; a
// few dozen votes is where the films people actually know begin.
const KNOWN_VOTES = 50;

function filmographyOf(crew: readonly PersonCrewCredit[]): DirectorFilm[] {
  const today = new Date().toISOString().slice(0, 10);
  const byTitle = new Map<string, PersonCrewCredit>();
  for (const credit of crew) {
    if (credit.job !== "Director" || !credit.posterPath) continue;
    if (!credit.releaseDate || credit.releaseDate > today) continue;
    if (credit.voteCount < KNOWN_VOTES) continue;
    const key = credit.title.toLowerCase();
    const held = byTitle.get(key);
    if (!held || held.voteCount < credit.voteCount) byTitle.set(key, credit);
  }
  // The portrait has a slot per film; past that, the best known stay.
  return [...byTitle.values()]
    .sort((a, b) => b.voteCount - a.voteCount)
    .slice(0, MAX_FILMS)
    .map((credit) => ({
      id: credit.id,
      posterPath: credit.posterPath!,
      title: credit.title,
      year: credit.releaseYear,
    }))
    .sort(
      (a, b) => (a.year ?? 0) - (b.year ?? 0) || a.title.localeCompare(b.title),
    );
}

async function readDirectors(): Promise<Director[]> {
  const directors = await batched(DIRECTORS, 5, async (entry, i) => {
    const person = await getPersonDetails(entry.person);
    const films = person.success ? filmographyOf(person.data.credits.crew) : [];
    const profilePath = person.success ? person.data.profilePath : null;
    if (films.length === 0 || !profilePath) {
      report("Directors", new Error(`Incomplete: ${entry.name}`));
      return null;
    }
    const director: Director = {
      born: entry.born,
      died: entry.died,
      films,
      id: entry.person,
      name: entry.name,
      place: person.success ? person.data.placeOfBirth : null,
      profilePath,
      rank: i + 1,
    };
    return director;
  });
  return directors.filter(
    (director): director is Director => director !== null,
  );
}

export const getDirectors = cache(() =>
  kept("spotlight:directors:v4", readDirectors),
);
