import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UserError } from "@omerdlw/base-framework/utils";
import { createServerSupabaseClient } from "@/infrastructure/supabase/server";
import { SESSION_CHECKED_HEADER } from "@/infrastructure/supabase/session";
import { MAX_AUTH_AGE_SECONDS } from "../lib/constants";
import type { AuthUser } from "../lib/types";
import { toAuthUser } from "../lib/utils";

export async function getOptionalUser(): Promise<AuthUser | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getClaims();
  const user = error ? null : toAuthUser(data?.claims);
  if (!user) return null;

  const checkedByProxy =
    (await headers()).get(SESSION_CHECKED_HEADER) === user.sessionId;
  if (!user.sessionId || checkedByProxy) return user;

  try {
    const { data: session, error: sessionError } = await supabase
      .from("auth_sessions")
      .select("revoked_at")
      .eq("session_id", user.sessionId)
      .maybeSingle();
    return sessionError || session?.revoked_at ? null : user;
  } catch {
    return null;
  }
}

export async function requireUser({
  redirectTo,
}: { redirectTo?: string } = {}): Promise<AuthUser> {
  const user = await getOptionalUser();
  if (user) return user;
  if (redirectTo) redirect(redirectTo);
  throw new UserError("Authentication required", 401);
}

function latestAuthenticationAt(user: AuthUser): number {
  const methods = user.claims.amr;
  if (!Array.isArray(methods)) return 0;
  return methods.reduce<number>((latest, method) => {
    const at = Number((method as { timestamp?: unknown })?.timestamp) || 0;
    return Math.max(latest, at);
  }, 0);
}

export async function requireRecentAuthentication(): Promise<AuthUser> {
  const user = await requireUser();
  const at = latestAuthenticationAt(user);
  const age = Math.floor(Date.now() / 1000) - at;
  if (!at || age > MAX_AUTH_AGE_SECONDS) {
    throw new UserError(
      "For your security, please sign in again to continue",
      403,
    );
  }
  return user;
}
