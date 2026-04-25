import { NextResponse } from 'next/server';

import { searchContent } from '@/core/clients/tmdb/server';
import { CACHE_CONTROL, cacheControlHeaders } from '@/core/services/shared/cache-policy.server';

export async function GET(request) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  const type = searchParams.get('type') === 'person' ? 'person' : 'movie';
  const page = Number(searchParams.get('page') || 1);

  if (!query.trim()) {
    return NextResponse.json(
      {
        page: 1,
        results: [],
        total_pages: 0,
        total_results: 0,
      },
      {
        headers: cacheControlHeaders(CACHE_CONTROL.PUBLIC_TMDB_SEARCH),
      }
    );
  }

  const response = await searchContent(query, type, page);
  const data = response.data || { results: [] };

  return NextResponse.json(data, {
    status: response.status || 200,
    headers: cacheControlHeaders(CACHE_CONTROL.PUBLIC_TMDB_SEARCH),
  });
}
