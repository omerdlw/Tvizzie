import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import {
  requireSupabasePublicConfig,
  requireSupabaseSecretKey,
} from "@/infrastructure/env";
import type { Database } from "./database.types";
import { isHttpsRequest } from "./session";

export async function createServerSupabaseClient(): Promise<
  SupabaseClient<Database>
> {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  const { publishableKey, url } = requireSupabasePublicConfig();

  return createServerClient<Database>(url, publishableKey, {
    auth: {
      experimental: { passkey: true },
      flowType: "pkce",
    },
    cookieOptions: { secure: isHttpsRequest(headerList) },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, options, value }) => {
            cookieStore.set(name, value, options);
          });
        } catch {}
      },
    },
  });
}

export function createAdminSupabaseClient(): SupabaseClient<Database> {
  const { url } = requireSupabasePublicConfig();

  return createClient<Database>(url, requireSupabaseSecretKey(), {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      experimental: { passkey: true },
      persistSession: false,
    },
  });
}
