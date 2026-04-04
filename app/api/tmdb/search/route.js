import { NextResponse } from 'next/server';

import { getMovieBase, searchContent } from '@/core/clients/tmdb/server';

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
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
        },
      }
    );
  }

  const response = await searchContent(query, type, page);
  const data = response.data || { results: [] };

  if (type === 'movie' && data.results.length > 0) {
    data.results = await Promise.all(
      data.results.map(async (item) => {
        if (item.media_type !== 'movie') return item;

        try {
          const detail = await getMovieBase(item.id);
          const director = detail.data?.credits?.crew?.find((member) => member.job === 'Director')?.name;

          return {
            ...item,
            status: detail.data?.status,
            director,
          };
        } catch {
          return item;
        }
      })
    );
  }

  return NextResponse.json(data, {
    status: response.status || 200,
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
    },
  });
}
