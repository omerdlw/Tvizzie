import { notFound } from 'next/navigation'

import { getTvComputedData } from '@/components/tv/utils'
import { TMDB_IMG } from '@/lib/constants'
import { getServerAppUrl } from '@/lib/utils/server-url'
import { TmdbService } from '@/services/tmdb.service'

import TvDetailClient from './client'

export async function generateMetadata({ params }) {
  const resolvedParams = await params
  const { id } = resolvedParams
  const response = await TmdbService.getDetailBundle(id, 'tv')
  const show = response?.data

  if (!show) {
    return { title: 'TV Show Not Found' }
  }

  const name = show.name
  const title = show.first_air_date
    ? `${name} (${show.first_air_date.split('-')[0]}) - Tvizzie`
    : `${name} - Tvizzie`

  let description = show.overview || `Details for ${name}`
  if (description.length > 150) {
    description = description.substring(0, 150).replace(/\s+\S*$/, '')
  }

  const imageUrl = show.backdrop_path
    ? `${TMDB_IMG}/w1280${show.backdrop_path}`
    : undefined

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'video.tv_show',
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

export default async function TvDetailPage({ params }) {
  const resolvedParams = await params
  const { id } = resolvedParams

  const response = await TmdbService.getDetailBundle(id, 'tv')
  const show = response?.data

  if (!show || response.status === 404) {
    notFound()
  }

  let imdbRatings = []
  try {
    const scoreRes = await TmdbService.getScoreTable(show.id)
    if (scoreRes.data) {
      imdbRatings = scoreRes.data
    }
  } catch (err) {
    console.error('Failed to fetch IMDB ratings for TV show', err)
  }

  const computed = getTvComputedData(show)
  const { imdbId } = computed

  let rating = computed.rating
  let imdbVotes = null
  if (imdbId) {
    try {
      const imdbRes = await fetch(await getServerAppUrl(`/api/imdb-rating/${imdbId}`), {
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
      console.error('Failed to fetch IMDB rating override for TV:', err)
    }
  }

  return (
    <>
      <TvDetailClient
        computed={{ ...computed, rating, imdbVotes, imdbRatings }}
        imdbRatings={imdbRatings}
        show={show}
      />
    </>
  )
}
