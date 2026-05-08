import { NextResponse } from 'next/server';

import { discoverContent } from '@/core/clients/tmdb/server';
import { CACHE_CONTROL, cacheControlHeaders } from '@/core/services/shared/cache-policy.server';

export async function GET(request) {
  const searchParams = request.nextUrl.searchParams;
  const genreId = searchParams.get('genreId') || 'all';
  const page = Number(searchParams.get('page') || 1);
  const sortBy = searchParams.get('sortBy') || 'popularity.desc';

  const response = await discoverContent({
    genreId,
    page,
    sortBy,
  });

  return NextResponse.json(response.data || { results: [] }, {
    status: response.status || 200,
    headers: cacheControlHeaders(CACHE_CONTROL.PUBLIC_TMDB_DISCOVER),
  });
}
