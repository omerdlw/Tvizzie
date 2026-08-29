import { updateSession } from '@/infrastructure/supabase/client';

export async function middleware(request) {
  return updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/tmdb|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
