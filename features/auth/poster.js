'use client';

import { useEffect, useState } from 'react';

export default function AuthPoster() {
  const [poster, setPoster] = useState(null);

  useEffect(() => {
    async function fetchPoster() {
      try {
        const res = await fetch('/api/tmdb/trending');
        const data = await res.json();
        if (data?.poster) {
          setPoster(data.poster);
        }
      } catch (err) {
        console.error('Failed to fetch poster:', err);
      }
    }
    fetchPoster();
  }, []);

  if (!poster) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#cbd5e1]">
        <div className="size-8 animate-spin rounded-full border-2 border-[#0284c7] border-t-[#0f172a]" />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-[#cbd5e1]">
      <img
        src={poster.posterPath}
        alt={poster.title}
        className="auth-poster-drift-slow h-full w-full object-cover opacity-60"
      />
      <div className="absolute inset-0 bg-linear-to-t from-[#e2e8f0] via-[#cbd5e1] to-[#94a3b8]" />
      <div className="absolute right-12 bottom-12 left-12 text-[#0f172a]">
        <h2 className="text-4xl leading-tight font-bold">{poster.title}</h2>
        <p className="mt-3 text-sm font-medium tracking-widest text-[#0f172a] uppercase">
          {poster.year} • {poster.rating}/10
        </p>
        {poster.overview && (
          <p className="mt-4 line-clamp-3 max-w-lg text-sm leading-relaxed text-[#0f172a]">{poster.overview}</p>
        )}
      </div>
    </div>
  );
}
