import { createClient } from '@supabase/supabase-js'

import {
  assertSupabaseServerAdminEnv,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} from './constants'

let adminClient = null

export function createAdminClient() {
  assertSupabaseServerAdminEnv()

  if (adminClient) {
    return adminClient
  }

  adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return adminClient
}
