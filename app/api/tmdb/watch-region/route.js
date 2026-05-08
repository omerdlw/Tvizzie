import { NextResponse } from 'next/server';

import { CACHE_CONTROL, cacheControlHeaders } from '@/core/services/shared/cache-policy.server';
import { resolveWatchRegionFromRequestHeaders } from '@/core/services/tmdb/watch-region';

export async function GET(request) {
  return NextResponse.json(resolveWatchRegionFromRequestHeaders(request.headers), {
    headers: cacheControlHeaders(CACHE_CONTROL.NO_STORE),
  });
}
