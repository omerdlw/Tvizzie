import { tmdbImageSrcSet, tmdbImageUrl } from "@/infrastructure/tmdb/images";

export const GRID =
  "grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 lg:grid-cols-6";
const POSTER_SIZES = "(min-width: 1024px) 16vw, (min-width: 640px) 22vw, 30vw";

export function posterImage(path: string | null, sizes = POSTER_SIZES) {
  return {
    sizes,
    src: tmdbImageUrl("poster", path, "w342"),
    srcSet: tmdbImageSrcSet("poster", path, ["w185", "w342"]) ?? undefined,
  };
}
