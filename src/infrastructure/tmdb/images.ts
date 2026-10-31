import { TMDB_IMAGE_BASE_URL } from "./constants";

interface TmdbImageSizes {
  backdrop: "w300" | "w780" | "w1280" | "original";
  logo: "w45" | "w92" | "w154" | "w185" | "w300" | "w500" | "original";
  poster: "w92" | "w154" | "w185" | "w342" | "w500" | "w780" | "original";
  profile: "w45" | "w185" | "h632" | "original";
}

type TmdbImageKind = keyof TmdbImageSizes;

const IMAGE_PATH = /^\/[A-Za-z0-9_-]+\.(?:jpe?g|png|webp|svg)$/;

export function isTmdbImagePath(value: unknown): value is string {
  return typeof value === "string" && IMAGE_PATH.test(value);
}

export function tmdbImageUrl<K extends TmdbImageKind>(
  _kind: K,
  path: string | null | undefined,
  size: TmdbImageSizes[K],
): string | null {
  if (!path || !IMAGE_PATH.test(path)) return null;
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
}

export function tmdbImageSrcSet<K extends TmdbImageKind>(
  kind: K,
  path: string | null | undefined,
  sizes: readonly TmdbImageSizes[K][],
): string | null {
  const entries: string[] = [];
  for (const size of sizes) {
    const match = /^w(\d+)$/.exec(size);
    const url = tmdbImageUrl(kind, path, size);
    if (match && url) entries.push(`${url} ${match[1]}w`);
  }
  return entries.length > 0 ? entries.join(", ") : null;
}
