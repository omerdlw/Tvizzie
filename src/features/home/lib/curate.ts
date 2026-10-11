import type { FeaturedMovie } from "@/infrastructure/tmdb/types";

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

export function byPopularity<T extends Pick<FeaturedMovie, "popularity">>(
  movies: readonly T[],
): T[] {
  return [...movies].sort((a, b) => b.popularity - a.popularity);
}
