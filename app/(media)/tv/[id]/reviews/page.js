import { notFound } from 'next/navigation';

import { getMovieComputedData } from '@/features/movie/utils';
import { TMDB_IMG } from '@/core/constants';
import { getTvBase } from '@/core/clients/tmdb/server';
import { isDisplayableTv } from '@/core/clients/tmdb/sanitize';

import Client from '../../../movie/[id]/reviews/client';

function getTvTitle(tv = {}) {
  return tv?.name || tv?.original_name || 'Untitled';
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const response = await getTvBase(id);
  const tv = response?.data;

  if (!tv || !isDisplayableTv(tv, 'detail')) {
    return { title: 'TV Reviews Not Found' };
  }

  const titleText = getTvTitle(tv);
  const title = tv.first_air_date
    ? `${titleText} (${tv.first_air_date.split('-')[0]}) Reviews - Tvizzie`
    : `${titleText} Reviews - Tvizzie`;
  const description = `Read all reviews for ${titleText}.`;
  const imageUrl = tv.backdrop_path ? `${TMDB_IMG}/w1280${tv.backdrop_path}` : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
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

  const computed = getMovieComputedData(tv);

  return <Client computed={computed} mediaType="tv" movie={tv} />;
}

export const revalidate = 3600;
