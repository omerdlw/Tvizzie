import { createServerClient } from '@supabase/ssr';

import {
  SUPABASE_AUTH_COOKIE_OPTIONS,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from './public-config';

export function createSupabaseResponseClient(request, response) {
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookieOptions: SUPABASE_AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headers || {}).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });
}
