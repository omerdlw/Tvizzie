import { notFound } from 'next/navigation';

import { getMovieComputedData } from '@/features/movie/movie-data';
import { getImdbTitleRating } from '@/core/clients/imdb/server';
import { TMDB_IMG } from '@/core/constants';
import { getMovieBase, getMovieSecondary } from '@/core/clients/tmdb/server';
import { isDisplayableMovie } from '@/core/clients/tmdb/sanitize';

function getMovieTitle(movie, suffix = '') {
  const year = movie.release_date ? ` (${movie.release_date.split('-')[0]})` : '';

  return `${movie.title}${year}${suffix} - Tvizzie`;
}

export async function generateMovieMetadata({ params }) {
  const { id } = await params;
  const response = await getMovieBase(id);
  const movie = response?.data;

  if (!movie || !isDisplayableMovie(movie, 'detail')) {
    return { title: 'Movie Not Found' };
  }

  let description = movie.overview || `Details for ${movie.title}`;
  if (description.length > 150) {
    description = description.substring(0, 150).replace(/\s+\S*$/, '');
  }

  const title = getMovieTitle(movie);
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

export async function getMovieDetailRouteData(params) {
  const { id } = await params;
  const response = await getMovieBase(id);
  const movie = response?.data;

  if (!movie || response.status === 404 || !isDisplayableMovie(movie, 'detail')) {
    notFound();
  }

  const secondaryDataPromise = getMovieSecondary(id).then((secondaryResponse) => secondaryResponse?.data || {});
  const imdbRating = await getImdbTitleRating(movie?.imdb_id);
  const baseComputed = getMovieComputedData(movie);

  return {
    computed: {
      ...baseComputed,
      rating: imdbRating?.value?.toFixed(1) || baseComputed.rating,
    },
    movie,
    secondaryDataPromise,
  };
}
