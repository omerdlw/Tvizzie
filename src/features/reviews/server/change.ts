import "server-only";
import { report, toUserMessage } from "@omerdlw/base-framework/utils";
import { requireUser } from "@/features/auth/server/server";
import { checkRateLimitAsync } from "@/infrastructure/security/rate-limiter";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
import type { ReviewResult } from "../lib/types";

type Client = Awaited<ReturnType<typeof createServerSupabaseClient>>;

export const fail = (error: string): { error: string; success: false } => ({
  error,
  success: false,
});

export const ok = <T extends object = object>(extra?: T) =>
  ({ success: true, ...extra }) as ReviewResult<T>;

export async function change<T extends object = object>(
  name: string,
  fallback: string,
  work: (context: {
    client: Client;
    userId: string;
  }) => Promise<ReviewResult<T>>,
): Promise<ReviewResult<T>> {
  try {
    const user = await requireUser();
    const limit = await checkRateLimitAsync(`review-change:${user.id}`, {
      limit: 60,
      windowMs: 60 * 1000,
    });
    if (!limit.success) return fail("Too many requests, slow down a little");

    const client = await createServerSupabaseClient();
    return await work({ client, userId: user.id });
  } catch (error) {
    report(name, error);
    return fail(toUserMessage(error, { fallback }));
  }
}
