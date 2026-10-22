import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { report } from "@omerdlw/base-framework/utils";
import type { Database, Json } from "@/infrastructure/supabase/database.types";

// Logging a film or reviewing it adds it to watched through a trigger, which
// has only what the diary entry or review holds: no genres. The Watched
// filters read them from the payload, so the action that knows them writes
// them in. A failure leaves the film unfiltered by genre, nothing worse.
export async function rememberWatchedPayload(
  client: SupabaseClient<Database>,
  accountId: string,
  tmdbId: number,
  payload: Json,
): Promise<void> {
  const { error } = await client
    .from("account_watched")
    .update({ payload })
    .eq("account_id", accountId)
    .eq("tmdb_id", tmdbId);
  if (error) report("Watched payload", error);
}
