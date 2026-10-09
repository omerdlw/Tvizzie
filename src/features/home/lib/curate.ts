import type { FeaturedMovie } from "@/infrastructure/tmdb/types";

function attention(movie: Pick<FeaturedMovie, "voteCount">): number {
  return Math.min(1, Math.log10(1 + movie.voteCount) / 4.5);
}

export function notable<T extends Pick<FeaturedMovie, "voteCount">>(
  movies: readonly T[],
  minVotes: number,
): T[] {
  return movies.filter((movie) => movie.voteCount >= minVotes);
}

export function distinct<
  T extends Pick<FeaturedMovie, "id" | "releaseYear" | "title">,
>(movies: readonly T[]): T[] {
  const seen = new Set<string>();
  return movies.filter((movie) => {
    const keys = [
      `id:${movie.id}`,
      `title:${movie.title.toLowerCase()}:${movie.releaseYear ?? ""}`,
    ];
    if (keys.some((key) => seen.has(key))) return false;
    keys.forEach((key) => seen.add(key));
    return true;
  });
}

export function rankTrending<T extends Pick<FeaturedMovie, "voteCount">>(
  movies: readonly T[],
): T[] {
  const count = Math.max(movies.length, 1);
  return movies
    .map((movie, position) => ({
      movie,
      score: 0.6 * (1 - position / count) + 0.4 * attention(movie),
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ movie }) => movie);
}

export function byPopularity<T extends Pick<FeaturedMovie, "popularity">>(
  movies: readonly T[],
): T[] {
  return [...movies].sort((a, b) => b.popularity - a.popularity);
}

export function spreadGenres<T extends { genreIds: readonly number[] }>(
  movies: readonly T[],
  { limit, within }: { limit: number; within: number },
): T[] {
  const counts = new Map<number, number>();
  const front: T[] = [];
  const aside: T[] = [];

  for (const movie of movies) {
    const lead = movie.genreIds[0];
    const used = lead === undefined ? 0 : (counts.get(lead) ?? 0);
    if (front.length < within && used < limit) {
      front.push(movie);
      if (lead !== undefined) counts.set(lead, used + 1);
    } else {
      aside.push(movie);
    }
  }
  return [...front, ...aside];
}
