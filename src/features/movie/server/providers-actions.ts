"use server";

import "server-only";
import { report } from "@omerdlw/base-framework/utils";
import { isMovieId } from "@/infrastructure/tmdb/movies";
import { getMovieDetails } from "@/infrastructure/tmdb/server";
import type {
  ProviderEntry,
  RegionProviders,
  WatchProvidersResult,
} from "../lib/providers";

type Provider = {
  displayPriority: number;
  logoPath: string | null;
  name: string;
  providerId: number;
};

const REGION = /^[A-Z]{2}$/;

const safeLink = (value: string | null | undefined) =>
  typeof value === "string" && value.startsWith("https://www.themoviedb.org/")
    ? value
    : null;

const entries = (
  ...groups: readonly (readonly Provider[])[]
): ProviderEntry[] => {
  const seen = new Set<number>();
  return groups
    .flat()
    .sort((a, b) => a.displayPriority - b.displayPriority)
    .filter((p) => !seen.has(p.providerId) && seen.add(p.providerId))
    .map((p) => ({ id: p.providerId, logoPath: p.logoPath, name: p.name }));
};

export async function getWatchProvidersAction(
  tmdbId: number,
): Promise<WatchProvidersResult> {
  if (!isMovieId(tmdbId)) return { error: "Invalid movie", success: false };

  try {
    const result = await getMovieDetails(tmdbId);
    if (!result.success) {
      return { error: "Could not load this movie, try again", success: false };
    }

    const regions: Record<string, RegionProviders> = {};
    for (const [code, value] of Object.entries(result.data.watchProviders)) {
      if (!REGION.test(code)) continue;
      const region: RegionProviders = {
        buy: entries(value.buy),
        free: entries(value.free, value.ads),
        link: safeLink(value.link),
        rent: entries(value.rent),
        stream: entries(value.flatrate),
      };
      if (
        region.buy.length +
          region.free.length +
          region.rent.length +
          region.stream.length >
        0
      ) {
        regions[code] = region;
      }
    }

    return { regions, success: true };
  } catch (error) {
    report("WatchProviders read", error);
    return { error: "Could not load where to watch", success: false };
  }
}
