import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/infrastructure/supabase/client";
import type { MovieSocialProof } from "../lib/types";
import { buildMovieSocialProof } from "../lib/utils";

const MOVIE_PROOF_LIMIT = 100;

export async function readMovieSocialProof(
  client: SupabaseClient<Database>,
  tmdbId: number,
): Promise<MovieSocialProof> {
  const { data, error } = await client.rpc("get_movie_social_proof", {
    p_limit: MOVIE_PROOF_LIMIT,
    p_tmdb_id: tmdbId,
  });
  if (error) throw error;
  return buildMovieSocialProof(data ?? []);
}
