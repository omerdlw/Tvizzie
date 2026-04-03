import { NextResponse } from 'next/server'

import { searchContent } from '@/core/clients/tmdb/server'

export async function GET(request) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q') || ''
  const type = searchParams.get('type') === 'person' ? 'person' : 'movie'
  const page = Number(searchParams.get('page') || 1)

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
    )
  }

  const response = await searchContent(query, type, page)

  return NextResponse.json(response.data || { results: [] }, {
    status: response.status || 200,
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
    },
  })
}
