import { notFound } from 'next/navigation';

import { getMovieComputedData } from '@/features/movie/utils';
import { TMDB_IMG } from '@/core/constants';
import { getMovieBase, getMovieSecondary } from '@/core/clients/tmdb/server';
import { isDisplayableMovie } from '@/core/clients/tmdb/sanitize';

import Client from './client';

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const response = await getMovieBase(id);
  const movie = response?.data;

  if (!movie || !isDisplayableMovie(movie, 'detail')) {
    return { title: 'Movie Not Found' };
  }

  const title = movie.release_date
    ? `${movie.title} (${movie.release_date.split('-')[0]}) - Tvizzie`
    : `${movie.title} - Tvizzie`;

  let description = movie.overview || `Details for ${movie.title}`;
  if (description.length > 150) {
    description = description.substring(0, 150).replace(/\s+\S*$/, '');
  }

  const imageUrl = movie.backdrop_path ? `${TMDB_IMG}/w1280${movie.backdrop_path}` : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'video.movie',
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
  const secondaryDataPromise = getMovieSecondary(id).then((secondaryResponse) => secondaryResponse?.data || {});

  return <Client key={movie.id} computed={computed} movie={movie} secondaryDataPromise={secondaryDataPromise} />;
}
