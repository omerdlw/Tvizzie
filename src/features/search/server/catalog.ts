import "server-only";

import { discoverMovies } from "@/infrastructure/tmdb/server";
import { MATCH, textMatch } from "../lib/rank";

const PAGES = { "popularity.desc": 5, "vote_count.desc": 25 } as const;
const LIFETIME_MS = 6 * 60 * 60 * 1000;

interface CatalogFilm {
  id: number;
  originalTitle: string | null;
  popularity: number;
  posterPath: string | null;
  releaseYear: number | null;
  title: string;
  voteCount: number;
}

let loaded: { at: number; films: Promise<CatalogFilm[]> } | null = null;

async function load(): Promise<CatalogFilm[]> {
  const requests = Object.entries(PAGES).flatMap(([sort, pages]) =>
    Array.from({ length: pages }, (_, index) =>
      discoverMovies({
        page: index + 1,
        sort: sort as keyof typeof PAGES,
      }),
    ),
  );
  const pages = await Promise.all(requests);

  const films = new Map<number, CatalogFilm>();
  for (const page of pages) {
    if (!page.success) continue;
    for (const movie of page.data.results) {
      films.set(movie.id, {
        id: movie.id,
        originalTitle: null,
        popularity: movie.popularity,
        posterPath: movie.posterPath,
        releaseYear: movie.releaseYear,
        title: movie.title,
        voteCount: movie.voteCount,
      });
    }
  }
  if (films.size < 100) loaded = null;
  return [...films.values()];
}

function catalog(): Promise<CatalogFilm[]> {
  if (!loaded || Date.now() - loaded.at > LIFETIME_MS) {
    loaded = { at: Date.now(), films: load() };
  }
  return loaded.films;
}

export async function catalogMatches(
  query: string,
  limit = 8,
): Promise<CatalogFilm[]> {
  const films = await catalog().catch(() => []);
  return films
    .map((film) => ({ film, match: textMatch(film.title, query) }))
    .filter(({ match }) => match >= MATCH.phraseStart)
    .sort((a, b) => b.match - a.match || b.film.voteCount - a.film.voteCount)
    .slice(0, limit)
    .map(({ film }) => film);
}
