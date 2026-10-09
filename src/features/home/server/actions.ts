"use server";

import "server-only";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { getOptionalUser } from "@/features/auth/server/server";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
import { CANON_IDS } from "../lib/canon";
import type { HomeCommunity } from "../lib/types";
import { readHomeCommunity } from "./community";

type HomeCommunityResult =
  | { community: HomeCommunity; success: true }
  | { error: string; success: false };

export async function getHomeCommunityAction(): Promise<HomeCommunityResult> {
  try {
    const user = await getOptionalUser();
    const client = await createServerSupabaseClient();
    return {
      community: await readHomeCommunity(client, user?.id ?? null),
      success: true,
    };
  } catch (error) {
    report("Home community read", error);
    return {
      error: toUserMessage(error, { fallback: "Could not load the community" }),
      success: false,
    };
  }
}

type CanonProgressResult =
  { seen: number[]; success: true } | { error: string; success: false };

export async function getCanonProgressAction(): Promise<CanonProgressResult> {
  try {
    const user = await getOptionalUser();
    if (!user) return { seen: [], success: true };

    const client = await createServerSupabaseClient();
    const { data, error } = await client
      .from("account_watched")
      .select("tmdb_id")
      .eq("account_id", user.id)
      .in("tmdb_id", [...CANON_IDS]);
    if (error) throw error;

    return { seen: (data ?? []).map((row) => row.tmdb_id), success: true };
  } catch (error) {
    report("Canon progress read", error);
    return {
      error: toUserMessage(error, { fallback: "Could not load your progress" }),
      success: false,
    };
  }
}
