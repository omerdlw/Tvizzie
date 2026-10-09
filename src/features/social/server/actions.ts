"use server";

import "server-only";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { getOptionalUser } from "@/features/auth/server/server";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
import { isMovieId } from "@/infrastructure/tmdb/movies";
import type { MovieSocialProof, SocialResult } from "../lib/types";
import { readMovieSocialProof } from "./queries";

export async function getMovieSocialProofAction(
  tmdbId: number,
): Promise<SocialResult<{ proof: MovieSocialProof | null }>> {
  if (!isMovieId(tmdbId)) return { error: "Invalid movie", success: false };

  try {
    const user = await getOptionalUser();
    if (!user) return { proof: null, success: true };

    const client = await createServerSupabaseClient();
    return { proof: await readMovieSocialProof(client, tmdbId), success: true };
  } catch (error) {
    report("Social proof read", error);
    return {
      error: toUserMessage(error, {
        fallback: "Could not load what your friends did",
      }),
      success: false,
    };
  }
}
