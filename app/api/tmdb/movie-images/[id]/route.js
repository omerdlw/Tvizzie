import { NextResponse } from 'next/server';

import { getMovieImages } from '@/core/clients/tmdb/server';

export async function GET(_request, { params }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  const response = await getMovieImages(id);

  return NextResponse.json(response.data || { backdrops: [], posters: [] }, {
    status: response.status || 200,
    headers: {
      'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400',
    },
  });
}
