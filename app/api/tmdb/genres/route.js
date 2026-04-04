import { NextResponse } from 'next/server';

import { getGenres } from '@/core/clients/tmdb/server';

export async function GET() {
  const response = await getGenres();

  return NextResponse.json(response.data || [], {
    status: response.status || 200,
    headers: {
      'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=604800',
    },
  });
}
