import { NextResponse } from 'next/server';

import { getGenres } from '@/core/clients/tmdb/server';
import { CACHE_CONTROL, cacheControlHeaders } from '@/core/services/shared/cache-policy.server';

export async function GET() {
  const response = await getGenres();

  return NextResponse.json(response.data || [], {
    status: response.status || 200,
    headers: cacheControlHeaders(CACHE_CONTROL.PUBLIC_TMDB_GENRES),
  });
}
