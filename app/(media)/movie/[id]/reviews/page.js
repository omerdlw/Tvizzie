import { notFound } from 'next/navigation';

import { getMovieComputedData } from '@/features/movie/utils';
import { TMDB_IMG } from '@/core/constants';
import { getMovieBase } from '@/core/clients/tmdb/server';
import { isDisplayableMovie } from '@/core/clients/tmdb/sanitize';

import Client from './client';

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
