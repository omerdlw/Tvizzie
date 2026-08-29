import { NextResponse } from 'next/server';

import { searchCommunity } from '@/domains/search/server/community-search';
import { CACHE_CONTROL, cacheControlHeaders } from '@/infrastructure/http/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const payload = await searchCommunity({
      limitCount: searchParams.get('limitCount'),
      query: searchParams.get('q') || searchParams.get('query'),
      type: searchParams.get('type'),
    });

    return NextResponse.json(payload, {
      headers: cacheControlHeaders(CACHE_CONTROL.PUBLIC_COMMUNITY_SEARCH),
    });
  } catch {
    return NextResponse.json(
      { items: [], lists: [], reviews: [] },
      { headers: cacheControlHeaders(CACHE_CONTROL.NO_STORE) },
    );
  }
}
