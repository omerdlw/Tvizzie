import { createSupabaseAuthAdapter } from '@/core/modules/auth'

const SUPABASE_ADAPTER = createSupabaseAuthAdapter({
  oauthDefaultNextPath: '/account',
})

export const AUTH_CONFIG = {
  clearSessionOnUnauthorized: true,
  hydrateFromStorage: false,
  refreshOnWindowFocus: true,
  persistSession: false,
  storageKey: 'app_auth_session',
  refreshLeewayMs: 60 * 1000,
  enabled: true,
  adapter: SUPABASE_ADAPTER,
}
