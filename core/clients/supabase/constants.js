function normalizeValue(value) {
  return String(value || '').trim();
}

export const SUPABASE_URL = normalizeValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
export const SUPABASE_PUBLISHABLE_KEY = normalizeValue(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
export const SUPABASE_SERVICE_ROLE_KEY = normalizeValue(process.env.SUPABASE_SERVICE_ROLE_KEY);

export function assertSupabaseBrowserEnv() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      'Supabase browser environment is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
    );
  }
}

export function assertSupabaseServerAdminEnv() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Supabase server admin environment is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    );
  }
}
