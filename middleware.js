import { updateSession } from '@/core/clients/supabase/proxy';

export async function middleware(request) {
  return updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/tmdb|api/health|api/observability/web-vitals|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
