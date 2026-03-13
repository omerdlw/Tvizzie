import { TMDB_IMG } from '@/lib/constants'

import { notFound } from 'next/navigation'

import { TmdbService } from '@/services/tmdb.service'

import PersonDetailClient from './client'


export async function generateMetadata({ params }) {
  const resolvedParams = await params
  const { id } = resolvedParams
  const response = await TmdbService.getDetailBundle(id, 'person')
  const person = response?.data

  if (!person) {
    return { title: 'Person Not Found' }
  }

  const title = `${person.name} - Tvizzie`

  let description =
    person.biography?.trim() || `Information about ${person.name}`
  if (description.length > 150) {
    description = description.substring(0, 150).replace(/\s+\S*$/, '')
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
