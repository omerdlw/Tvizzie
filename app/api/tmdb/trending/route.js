import { NextResponse } from 'next/server';

import { getTrending } from '@/core/clients/tmdb/server';

const DEFAULT_MOVIE_LIMIT = 3;
const MAX_MOVIE_LIMIT = 6;

function mapMovie(movie) {
  return {
    id: movie.id,
    title: movie.title || movie.original_title || 'Untitled',
    posterPath: `https://image.tmdb.org/t/p/w780${movie.poster_path}`,
    backdropPath: `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`,
    year: movie.release_date ? movie.release_date.slice(0, 4) : null,
    rating: movie.vote_average ? movie.vote_average.toFixed(1) : null,
    overview: movie.overview || '',
  };
}

function pickStableMovies(movies, limit) {
  if (movies.length <= limit) {
    return movies.slice(0, limit);
  }

  const rotationWindow = Math.floor(Date.now() / (1000 * 60 * 60 * 6));
  const startIndex = rotationWindow % movies.length;

  return Array.from({ length: limit }, (_, index) => movies[(startIndex + index) % movies.length]);
}

function resolveLimit(rawLimit) {
  const parsedLimit = Number(rawLimit || DEFAULT_MOVIE_LIMIT);

  if (!Number.isFinite(parsedLimit) || parsedLimit < 1) {
    return DEFAULT_MOVIE_LIMIT;
  }

  return Math.min(Math.floor(parsedLimit), MAX_MOVIE_LIMIT);
}

export async function GET(request) {
  try {
    const limit = resolveLimit(request.nextUrl.searchParams.get('limit'));
    const response = await getTrending('day', 'movie');

    if (!response.data?.results) {
      return NextResponse.json({ movies: [], poster: null }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const candidates = response.data.results.filter(
      (movie) => movie.poster_path && movie.backdrop_path && movie.vote_average > 5
    );

    if (candidates.length === 0) {
      return NextResponse.json({ movies: [], poster: null }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const movies = pickStableMovies(candidates, limit).map(mapMovie);
    const poster = movies[0] || null;

    return NextResponse.json(
      {
        movies,
        poster,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400',
        },
      }
    );
  } catch {
    return NextResponse.json(
      { movies: [], poster: null },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' } }
    );
  }
}
