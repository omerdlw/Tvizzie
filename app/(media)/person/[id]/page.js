import { notFound } from 'next/navigation';

import {
  createMediaMetadata,
  delayMediaSkeletonPreview,
  loadMediaRouteData,
} from '@/domains/media/server/title-route';
import {
  getPersonBase,
  getPersonSecondary,
} from '@/infrastructure/tmdb/clients/tmdb-server-client';
import { getPersonAwards } from '@/domains/media/server/person-awards';
import PersonDetailView from '@/domains/media/ui/pages/person-detail';

export async function generateMetadata({ params }) {
  const { media: person, response } = await loadMediaRouteData(params, getPersonBase);
  if (!person) console.error('[generateMetadata person error]', response);

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

export default async function PersonDetailPage({ params, searchParams }) {
  await delayMediaSkeletonPreview(searchParams);
  const { id, media: person, response } = await loadMediaRouteData(params, getPersonBase);

  if (response?.status === 404) {
    notFound();
  }

  if (!person) {
    if (response?.status >= 500 || response?.error) {
      throw new Error(`Failed to load person data (${response?.error || response?.status})`);
    }
    notFound();
  }

  const secondaryDataPromise = getPersonSecondary(id).then(
    (secondaryResponse) => secondaryResponse?.data || {},
  );
  const awardsPromise = getPersonAwards(id).catch(() => null);

  return (
    <PersonDetailView
      key={person.id}
      person={person}
      secondaryDataPromise={secondaryDataPromise}
      awardsPromise={awardsPromise}
    />
  );
}

export const revalidate = 3600;
