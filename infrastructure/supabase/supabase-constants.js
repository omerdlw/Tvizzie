import { normalizeValue } from '@/domains/shell/shared/utils';

const DAYS_PER_MONTH = 30;
const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;

export const SUPABASE_URL = normalizeValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
export const SUPABASE_PUBLISHABLE_KEY = normalizeValue(
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
export const SUPABASE_SERVICE_ROLE_KEY = normalizeValue(process.env.SUPABASE_SERVICE_ROLE_KEY);

export const SUPABASE_AUTH_INACTIVITY_TIMEOUT_SECONDS =
  DAYS_PER_MONTH * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE;

export const SUPABASE_AUTH_COOKIE_OPTIONS = Object.freeze({
  maxAge: SUPABASE_AUTH_INACTIVITY_TIMEOUT_SECONDS,
  path: '/',
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false',
});

export function assertSupabaseBrowserEnv() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      'Supabase browser environment is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    );
  }
}

export function assertSupabaseServerAdminEnv() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Supabase server admin environment is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
    );
  }
}
