import 'server-only';

import { normalizeValue } from '@/shared/normalize';

import { SUPABASE_URL } from './public-config';

export const SUPABASE_SERVICE_ROLE_KEY = normalizeValue(process.env.SUPABASE_SERVICE_ROLE_KEY);

export function assertSupabaseServerAdminEnv() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Supabase server admin environment is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
    );
  }
}
