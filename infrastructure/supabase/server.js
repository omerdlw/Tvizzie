import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { normalizeValue } from '@/shared';
import {
  SUPABASE_AUTH_COOKIE_OPTIONS,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from './client.js';

export * from './client.js';

export const SUPABASE_SERVICE_ROLE_KEY = normalizeValue(process.env.SUPABASE_SERVICE_ROLE_KEY);

export function assertSupabaseServerAdminEnv() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Supabase server admin environment is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
    );
  }
}

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

