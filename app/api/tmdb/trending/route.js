import { NextResponse } from 'next/server';

import { getTrending } from '@/core/clients/tmdb/server';

const DEFAULT_MOVIE_LIMIT = 3;
const MAX_MOVIE_LIMIT = 6;

export const dynamic = 'force-dynamic';

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

function pickRandomMovies(movies, limit) {
  const copy = [...movies];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }

  return copy.slice(0, limit);
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

    const movies = pickRandomMovies(candidates, limit).map(mapMovie);
    const poster = movies[0] || null;

    return NextResponse.json(
      {
        movies,
        poster,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch {
    return NextResponse.json({ movies: [], poster: null }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
