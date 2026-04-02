import { NextResponse } from 'next/server'

import { getTrending } from '@/lib/tmdb/server'

export async function GET() {
  try {
    const response = await getTrending('day', 'movie')

    if (!response.data?.results) {
      return NextResponse.json({ poster: null })
    }

    const candidates = response.data.results.filter(
      (movie) => movie.poster_path && movie.backdrop_path && movie.vote_average > 5
    )

    if (candidates.length === 0) {
      return NextResponse.json({ poster: null })
    }

    const pick = candidates[Math.floor(Math.random() * candidates.length)]

    return NextResponse.json({
      poster: {
        id: pick.id,
        title: pick.title || pick.original_title,
        posterPath: `https://image.tmdb.org/t/p/w780${pick.poster_path}`,
        backdropPath: `https://image.tmdb.org/t/p/w1280${pick.backdrop_path}`,
        year: pick.release_date ? pick.release_date.slice(0, 4) : null,
        rating: pick.vote_average ? pick.vote_average.toFixed(1) : null,
        overview: pick.overview || '',
      },
    })
  } catch {
    return NextResponse.json({ poster: null })
  }
}
