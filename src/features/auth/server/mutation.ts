import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { checkRateLimit } from "@/infrastructure/security/rate-limiter";
import type { Database } from "@/infrastructure/supabase/client";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
import { requireUser } from "./user";

export type MutationResult<T extends object = object> =
  ({ success: true } & T) | { error: string; success: false };

export const fail = (error: string): { error: string; success: false } => ({
  error,
  success: false,
});

export const ok = <T extends object = object>(extra?: T) =>
  ({ success: true, ...extra }) as MutationResult<T>;

export async function mutate<T extends object = object>(
  {
    fallback,
    name,
    perMinute,
    scope,
  }: { fallback: string; name: string; perMinute: number; scope: string },
  work: (context: {
    client: SupabaseClient<Database>;
    userId: string;
  }) => Promise<MutationResult<T>>,
): Promise<MutationResult<T>> {
  try {
    const user = await requireUser();
    const limit = await checkRateLimit(`${scope}:${user.id}`, perMinute);
    if (!limit.success) return fail("Too many requests, slow down a little");

    const client = await createServerSupabaseClient();
    return await work({ client, userId: user.id });
  } catch (error) {
    report(name, error);
    return fail(toUserMessage(error, { fallback }));
  }
}
