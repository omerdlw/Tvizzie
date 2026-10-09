import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/infrastructure/supabase/client";
import type { MovieSocialProof, MutualFollowers } from "../lib/types";
import { buildMovieSocialProof, toPerson } from "../lib/utils";

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

export async function readMutualFollowers(
  client: SupabaseClient<Database>,
  accountId: string,
  limit = 3,
): Promise<MutualFollowers> {
  const { data, error } = await client.rpc("get_mutual_followers", {
    p_account_id: accountId,
    p_limit: limit,
  });
  if (error) throw error;

  const rows = data ?? [];
  return { people: rows.map(toPerson), total: Number(rows[0]?.total ?? 0) };
}
