'use client'

import { useEffect, useState } from 'react'

export default function AuthPoster() {
  const [poster, setPoster] = useState(null)
  
  useEffect(() => {
    async function fetchPoster() {
      try {
        const res = await fetch('/api/tmdb/trending')
        const data = await res.json()
        if (data?.poster) {
          setPoster(data.poster)
        }
      } catch (err) {
        console.error('Failed to fetch poster:', err)
      }
    }
    fetchPoster()
  }, [])
  
  if (!poster) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black">
        <div className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    )
  }

  return (
    <div className="relative h-full w-full bg-black">
      <img
        src={poster.posterPath}
        alt={poster.title}
        className="h-full w-full object-cover opacity-60 auth-poster-drift-slow"
      />
      <div className="absolute inset-0 bg-linear-to-t from-black via-black/40 to-black/10" />
      <div className="absolute bottom-12 left-12 right-12 text-white">
        <h2 className="text-4xl font-bold leading-tight">{poster.title}</h2>
        <p className="mt-3 text-sm font-medium text-white/60 uppercase tracking-widest">
          {poster.year} • {poster.rating}/10
        </p>
        {poster.overview && (
          <p className="mt-4 line-clamp-3 max-w-lg text-sm leading-relaxed text-white/70">
            {poster.overview}
          </p>
        )}
      </div>
    </div>
  )
}
