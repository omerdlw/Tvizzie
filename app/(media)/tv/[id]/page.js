import { notFound } from 'next/navigation';

import { getMovieComputedData } from '@/features/movie/utils';
import { TMDB_IMG } from '@/core/constants';
import { getTvBase, getTvSecondary } from '@/core/clients/tmdb/server';
import { isDisplayableTv } from '@/core/clients/tmdb/sanitize';

import Client from '../../movie/[id]/client';

function getTvTitle(tv = {}) {
  return tv?.name || tv?.original_name || 'Untitled';
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const response = await getTvBase(id);
  const tv = response?.data;

  if (!tv || !isDisplayableTv(tv, 'detail')) {
    return { title: 'TV Series Not Found' };
  }

  const titleText = getTvTitle(tv);
  const title = tv.first_air_date
    ? `${titleText} (${tv.first_air_date.split('-')[0]}) - Tvizzie`
    : `${titleText} - Tvizzie`;

  let description = tv.overview || `Details for ${titleText}`;
  if (description.length > 150) {
    description = description.substring(0, 150).replace(/\s+\S*$/, '');
  }

  const imageUrl = tv.backdrop_path ? `${TMDB_IMG}/w1280${tv.backdrop_path}` : undefined;

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
  };
}

export default async function Page({ params }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  const response = await getTvBase(id);
  const tv = response?.data;

  if (!tv || response.status === 404 || !isDisplayableTv(tv, 'detail')) {
    notFound();
  }

  const secondaryDataPromise = getTvSecondary(id).then((secondaryResponse) => secondaryResponse?.data || {});
  const computed = getMovieComputedData(tv);

  return (
    <Client
      key={`tv-${tv.id}`}
      computed={computed}
      mediaType="tv"
      movie={tv}
      secondaryDataPromise={secondaryDataPromise}
    />
  );
}

export const revalidate = 3600;
