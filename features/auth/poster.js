'use client';

import { useEffect, useMemo, useState } from 'react';

const FALLBACK_MOVIES = Object.freeze([
  {
    id: 'fallback-1',
    title: 'Interstellar',
    posterPath: 'https://image.tmdb.org/t/p/w342/nCbkOyOMTEwlEV0LtCOvCnwEONA.jpg',
    year: '2014',
    rating: '8.4',
  },
  {
    id: 'fallback-2',
    title: 'Dune: Part Two',
    posterPath: 'https://image.tmdb.org/t/p/w342/6izwz7rsy95ARzTR3poZ8H6c5pp.jpg',
    year: '2024',
    rating: '8.2',
  },
  {
    id: 'fallback-3',
    title: 'The Batman',
    posterPath: 'https://image.tmdb.org/t/p/w342/74xTEgt7R36Fpooo50r9T25onhq.jpg',
    year: '2022',
    rating: '7.8',
  },
]);

function randomThree(items) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }

  return copy.slice(0, 3);
}

function sanitizeMovies(movies = []) {
  if (!Array.isArray(movies)) {
    return [];
  }

  return movies
    .filter((movie) => movie?.title && movie?.posterPath)
    .map((movie) => ({
      id: movie.id,
      title: movie.title,
      posterPath: movie.posterPath,
      year: movie.year || 'N/A',
      rating: movie.rating || 'N/A',
    }));
}

export default function AuthPoster() {
  const [movies, setMovies] = useState([]);

  useEffect(() => {
    let isCancelled = false;

    async function fetchMovies() {
      try {
        const res = await fetch('/api/tmdb/trending?limit=6', {
          cache: 'no-store',
        });
        const data = await res.json();

        if (isCancelled) {
          return;
        }

        const parsedMovies = sanitizeMovies(data?.movies);
        if (parsedMovies.length > 0) {
          setMovies(parsedMovies);
        }
      } catch {
        if (!isCancelled) {
          setMovies([]);
        }
      }
    }

    fetchMovies();

    return () => {
      isCancelled = true;
    };
  }, []);

  const cards = useMemo(() => {
    const source = movies.length >= 3 ? movies : FALLBACK_MOVIES;
    return randomThree(source);
  }, [movies]);

  return (
    <div className="flex h-full w-full items-center justify-center px-8 py-10">
      <div className="grid w-full max-w-[560px] gap-4">
        {cards.map((movie) => (
          <article
            key={movie.id || movie.title}
            className="flex items-center gap-4 rounded-2xl border border-black/12 bg-[var(--color-primary)] p-3 shadow-[0_10px_22px_rgba(23,23,23,0.08)]"
          >
            <img src={movie.posterPath} alt={movie.title} className="h-24 w-16 rounded-xl border border-black/12 object-cover" />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-[var(--color-black)]">{movie.title}</p>
              <p className="mt-1 text-xs font-semibold tracking-[0.1em] text-black/45 uppercase">
                {movie.year} • {movie.rating}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
