import { createServerClient } from '@supabase/ssr';

import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
  assertSupabaseBrowserEnv,
} from '@/infrastructure/supabase/supabase-constants';
import { getRequestCookies } from './session-cookies.server';

export function createRequestSupabaseClient(request) {
  assertSupabaseBrowserEnv();

  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return getRequestCookies(request);
      },
      setAll() {
        
      },
    },
  });
}
