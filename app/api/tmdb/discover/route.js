import { NextResponse } from 'next/server'

import { discoverContent } from '@/lib/tmdb/server'

export async function GET(request) {
  const searchParams = request.nextUrl.searchParams
  const genreId = searchParams.get('genreId') || 'all'
  const page = Number(searchParams.get('page') || 1)
  const sortBy = searchParams.get('sortBy') || 'popularity.desc'

  const response = await discoverContent({
    genreId,
    page,
    sortBy,
  })

  return NextResponse.json(response.data || { results: [] }, {
    status: response.status || 200,
    headers: {
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=86400',
    },
  })
}
