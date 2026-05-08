import { notFound } from 'next/navigation';

import { getMovieComputedData } from '@/features/movie/utils';
import { TMDB_IMG } from '@/core/constants';
import { getMovieBase } from '@/core/clients/tmdb/server';
import { isDisplayableMovie } from '@/core/clients/tmdb/sanitize';

function getMovieReviewsTitle(movie) {
  const year = movie.release_date ? ` (${movie.release_date.split('-')[0]})` : '';

  return `${movie.title}${year} Reviews - Tvizzie`;
}

export async function generateMovieReviewsMetadata({ params }) {
  const { id } = await params;
  const response = await getMovieBase(id);
  const movie = response?.data;

  if (!movie || !isDisplayableMovie(movie, 'detail')) {
    return { title: 'Movie Reviews Not Found' };
  }

  const title = getMovieReviewsTitle(movie);
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

export async function getMovieReviewsRouteData(params) {
  const { id } = await params;
  const response = await getMovieBase(id);
  const movie = response?.data;

  if (!movie || response.status === 404 || !isDisplayableMovie(movie, 'detail')) {
    notFound();
  }

  return {
    computed: getMovieComputedData(movie),
    movie,
  };
}
