import "server-only";

import { unstable_cache } from "next/cache";
import { report } from "@omerdlw/base-framework/utils";
import { createPublicSupabaseClient } from "@/infrastructure/supabase/server";
import { PULSE_LENGTH, PULSE_MINIMUM } from "../lib/constants";
import type { PulseMovie } from "../lib/types";

const WEEK = 7;
const MONTH = 30;

async function read(days: number): Promise<PulseMovie[]> {
  const client = createPublicSupabaseClient();
  const { data, error } = await client.rpc("get_popular_movies", {
    p_days: days,
    p_limit: PULSE_LENGTH + 8,
  });
  if (error) {
    throw new Error(
      `Failed to load popular movies: ${error.message} (${error.code})`,
      { cause: error },
    );
  }

  return (data ?? []).map((row) => ({
    backdropPath: row.backdrop_path,
    genres: [],
    id: row.tmdb_id,
    likers: Number(row.likers),
    listers: Number(row.listers),
    posterPath: row.poster_path,
    releaseDate: row.release_date,
    reviewers: Number(row.reviewers),
    title: row.title,
    watchers: Number(row.watchers),
    year: row.release_date ? Number(row.release_date.slice(0, 4)) : null,
  }));
}

export const getCommunityPopular = unstable_cache(
  async (): Promise<PulseMovie[]> => {
    try {
      const week = await read(WEEK);
      return week.length >= PULSE_MINIMUM ? week : await read(MONTH);
    } catch (error) {
      report("Popular on Tvizzie", error);
      return [];
    }
  },
  ["home:popular-movies"],
  { revalidate: 15 * 60, tags: ["home:popular-movies"] },
);
