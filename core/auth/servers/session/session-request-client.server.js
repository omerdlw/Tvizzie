import { createServerClient } from '@supabase/ssr';

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, assertSupabaseBrowserEnv } from '@/core/clients/supabase/constants';
import { getRequestCookies } from './session.cookies.server';

export function createRequestSupabaseClient(request) {
  assertSupabaseBrowserEnv();

  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return getRequestCookies(request);
      },
      setAll() {
        // Route handlers manage cookie writes explicitly on response objects.
      },
    },
  });
}
