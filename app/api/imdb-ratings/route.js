import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 })
  }

  let finalId = id

  try {
    if (id.startsWith('tt')) {
      const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY
      const TMDB_BASE_URL =
        process.env.NEXT_PUBLIC_TMDB_BASE_URL || 'https://api.themoviedb.org/3'

      const findRes = await fetch(
        `${TMDB_BASE_URL}/find/${id}?external_source=imdb_id&language=en-US`,
        {
          headers: {
            Authorization: `Bearer ${TMDB_API_KEY}`,
            accept: 'application/json',
          },
        }
      )

      if (findRes.ok) {
        const findData = await findRes.json()
        if (findData) {
          const tvResult = findData.tv_results?.[0]
          const movieResult = findData.movie_results?.[0]
          if (tvResult) finalId = tvResult.id
          else if (movieResult) finalId = movieResult.id
        }
      }
    }

    const response = await fetch(
      `https://seriesgraph.com/api/shows/${finalId}/season-ratings`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        next: { revalidate: 3600 },
      }
    )

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch from external API: ${response.statusText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: 'Internal server error while fetching IMDB ratings' },
      { status: 500 }
    )
  }
}
