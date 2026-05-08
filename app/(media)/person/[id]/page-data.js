import { notFound } from 'next/navigation';

import { TMDB_IMG } from '@/core/constants';
import { getPersonBase, getPersonSecondary } from '@/core/clients/tmdb/server';

export async function generatePersonMetadata({ params }) {
  const { id } = await params;
  const response = await getPersonBase(id);
  const person = response?.data;

  if (!person) {
    return { title: 'Person Not Found' };
  }

  let description = person.biography?.trim() || `Information about ${person.name}`;
  if (description.length > 150) {
    description = description.substring(0, 150).replace(/\s+\S*$/, '');
  }

  const title = `${person.name} - Tvizzie`;
  const imageUrl = person.profile_path ? `${TMDB_IMG}/w500${person.profile_path}` : undefined;

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
  };
}

export async function getPersonDetailRouteData(params) {
  const { id } = await params;
  const response = await getPersonBase(id);
  const person = response?.data;

  if (!person || response.status === 404) {
    notFound();
  }

  return {
    person,
    secondaryDataPromise: getPersonSecondary(id).then((secondaryResponse) => secondaryResponse?.data || {}),
  };
}
