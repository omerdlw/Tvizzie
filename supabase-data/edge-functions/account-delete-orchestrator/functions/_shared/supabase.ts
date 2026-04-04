import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

import { normalizeValue } from './normalize.ts';

const SUPABASE_URL = normalizeValue(Deno.env.get('SUPABASE_URL'));
const SUPABASE_SERVICE_ROLE_KEY = normalizeValue(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));

let adminClient: SupabaseClient | null = null;

export function createAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase service role environment is not configured');
  }

  if (adminClient) {
    return adminClient;
  }

  adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}

export function isMissingFunctionError(error: { message?: string } | null | undefined) {
  const message = normalizeValue(error?.message).toLowerCase();
  return message.includes('function') && message.includes('does not exist');
}
