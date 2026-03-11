import { notFound } from 'next/navigation'

import { getMovieComputedData } from '@/components/movie/utils'
import { TmdbService } from '@/services/tmdb.service'

import MovieDetailClient from './client'

export async function generateMetadata({ params }) {
  const resolvedParams = await params
  const { id } = resolvedParams
  const response = await TmdbService.getDetailBundle(id, 'movie')
  const movie = response?.data

  if (!movie) {
    return { title: 'Movie Not Found' }
  }

  const title = movie.release_date
    ? `${movie.title} (${movie.release_date.split('-')[0]}) - Tvizzie`
    : `${movie.title} - Tvizzie`

  let description = movie.overview || `Details for ${movie.title}.`
  if (description.length > 150) {
    description = description.substring(0, 150).replace(/\s+\S*$/, '...')
  }

  const imageUrl = movie.backdrop_path
    ? `${TmdbService.TMDB_IMG || 'https://image.tmdb.org/t/p'}/w1280${
        movie.backdrop_path
      }`
    : undefined

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'video.movie',
      images: imageUrl ? [{ url: imageUrl, width: 1280, height: 720 }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
  }
}

export default async function MovieDetailPage({ params }) {
  const resolvedParams = await params
  const { id } = resolvedParams

  const response = await TmdbService.getDetailBundle(id, 'movie')
  const movie = response?.data

  if (!movie || response.status === 404) {
    notFound()
  }

  const computed = getMovieComputedData(movie)
  const { imdbId } = computed

  let rating = computed.rating
  let imdbVotes = null

  if (imdbId) {
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      const imdbRes = await fetch(`${baseUrl}/api/imdb-rating/${imdbId}`, {
        next: { revalidate: 86400 },
      })
      if (imdbRes.ok) {
        const imdbData = await imdbRes.json()
        if (imdbData.rating) {
          rating = imdbData.rating.toFixed(1)
          imdbVotes = imdbData.votes
        }
      }
    } catch (err) {
      console.error('Failed to fetch IMDB rating override:', err)
    }
  }

  return (
    <MovieDetailClient movie={movie} rating={rating} imdbVotes={imdbVotes} />
  )
}
