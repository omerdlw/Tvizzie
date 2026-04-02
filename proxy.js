import { updateSession } from '@/lib/supabase/proxy'
import { isSupabaseAuthProvider } from '@/config/provider.config'

export async function proxy(request) {
  if (!isSupabaseAuthProvider()) {
    return undefined
  }

  return updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
