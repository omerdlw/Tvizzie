import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { report } from "@omerdlw/base-framework/utils";
import type { Database, Json } from "@/infrastructure/supabase/database.types";

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
