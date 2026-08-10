import { notFound } from 'next/navigation';

import {
  createMediaMetadata,
  loadMediaRouteData,
} from '@/domains/media/server/title-route.server';
import {
  getPersonBase,
  getPersonSecondary,
} from '@/infrastructure/tmdb/clients/tmdb-server-client';
import Client from '@/app/(media)/person/[id]/client';

export async function generateMetadata({ params }) {
  const { media: person, response } = await loadMediaRouteData(params, getPersonBase);

  if (!person || response.status === 404) {
    return { title: 'Person Not Found' };
  }

  const title = `${person.name} - Tvizzie`;
  return createMediaMetadata({
    description: person.biography,
    fallbackDescription: `Information about ${person.name}`,
    fallbackTitle: 'Person Not Found',
    imageHeight: 750,
    imagePath: person.profile_path,
    imageSize: 'w500',
    imageWidth: 500,
    openGraphType: 'profile',
    title,
  });
}

export default async function PersonDetailPage({ params }) {
  const { id, media: person, response } = await loadMediaRouteData(params, getPersonBase);

  if (!person || response.status === 404) {
    notFound();
  }

  const secondaryDataPromise = getPersonSecondary(id).then(
    (secondaryResponse) => secondaryResponse?.data || {},
  );

  return <Client key={person.id} person={person} secondaryDataPromise={secondaryDataPromise} />;
}

export const revalidate = 3600;
