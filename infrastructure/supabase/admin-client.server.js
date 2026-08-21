import 'server-only';

import { createClient } from '@supabase/supabase-js';

import { SUPABASE_URL } from './public-config';
import { assertSupabaseServerAdminEnv, SUPABASE_SERVICE_ROLE_KEY } from './admin-config.server';

let adminClient = null;

export function createAdminClient() {
  assertSupabaseServerAdminEnv();

  if (adminClient) {
    return adminClient;
  }

  adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return adminClient;
}
