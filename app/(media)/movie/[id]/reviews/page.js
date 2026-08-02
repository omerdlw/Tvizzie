export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';

import { getMovieComputedData } from '@/domains/media/ui/media-data';
import { TMDB_IMG } from '@/shared/constants';
import { getMovieBase } from '@/infrastructure/tmdb/clients/tmdb-server-client';
import { isDisplayableMovie } from '@/infrastructure/tmdb/clients/sanitize';

import Client from '@/app/(media)/movie/[id]/reviews/client';

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const response = await getMovieBase(id);
  const movie = response?.data;

  if (!movie || !isDisplayableMovie(movie, 'detail')) {
    return { title: 'Movie Reviews Not Found' };
  }

  const title = movie.release_date
    ? `${movie.title} (${movie.release_date.split('-')[0]}) Reviews - Tvizzie`
    : `${movie.title} Reviews - Tvizzie`;
  const description = `Read all reviews for ${movie.title}.`;
  const imageUrl = movie.backdrop_path ? `${TMDB_IMG}/w1280${movie.backdrop_path}` : undefined;

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
  const response = await getMovieBase(id);
  const movie = response?.data;

  if (!movie || response.status === 404 || !isDisplayableMovie(movie, 'detail')) {
    notFound();
  }

  const computed = getMovieComputedData(movie);

  return <Client computed={computed} movie={movie} />;
}

export const revalidate = 3600;
