import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import {
  assertSupabaseBrowserEnv,
  SUPABASE_AUTH_COOKIE_OPTIONS,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from './supabase-constants';

export async function createClient() {
  assertSupabaseBrowserEnv();
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookieOptions: SUPABASE_AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {}
      },
    },
  });
}
