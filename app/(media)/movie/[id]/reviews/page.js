import { generateMovieReviewsMetadata, getMovieReviewsRouteData } from './page-data';

import Client from './client';

export const generateMetadata = generateMovieReviewsMetadata;

export default async function Page({ params }) {
  const { computed, movie } = await getMovieReviewsRouteData(params);

  return <Client computed={computed} movie={movie} />;
}

export const revalidate = 3600;
