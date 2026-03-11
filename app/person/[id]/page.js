import { notFound } from 'next/navigation'

import PersonDetailClient from './client'
import { TmdbService } from '@/services/tmdb.service'

const TMDB_IMG = 'https://image.tmdb.org/t/p'

export async function generateMetadata({ params }) {
  const resolvedParams = await params
  const { id } = resolvedParams
  const response = await TmdbService.getDetailBundle(id, 'person')
  const person = response?.data

  if (!person) {
    return { title: 'Person Not Found' }
  }

  const title = `${person.name} - Tvizzie`

  // Clean empty lines and limit to ~150 chars for SEO description
  let description =
    person.biography?.trim() || `Information about ${person.name}.`
  if (description.length > 150) {
    description = description.substring(0, 150).replace(/\s+\S*$/, '...')
  }

  const imageUrl = person.profile_path
    ? `${TMDB_IMG}/w500${person.profile_path}`
    : undefined

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      images: imageUrl ? [{ url: imageUrl, width: 500, height: 750 }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
  }
}

export default async function PersonDetailPage({ params }) {
  const resolvedParams = await params
  const { id } = resolvedParams

  const response = await TmdbService.getDetailBundle(id, 'person')
  const person = response?.data

  if (!person || response.status === 404) {
    notFound()
  }

  return <PersonDetailClient person={person} />
}
