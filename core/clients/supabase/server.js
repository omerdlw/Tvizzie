import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { assertSupabaseBrowserEnv, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './constants';

if (typeof window === 'undefined') {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('supabase.auth.getSession()') && args[0].includes('insecure')) {
      return;
    }
    originalWarn(...args);
  };
}

export async function createClient() {
  assertSupabaseBrowserEnv();
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // In server components this can throw. Proxy will persist refreshed cookies.
        }
      },
    },
  });
}
