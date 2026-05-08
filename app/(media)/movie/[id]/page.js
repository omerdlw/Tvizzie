import { generateMovieMetadata, getMovieDetailRouteData } from './page-data';

import Client from './client';

export const generateMetadata = generateMovieMetadata;

export default async function Page({ params }) {
  const { computed, movie, secondaryDataPromise } = await getMovieDetailRouteData(params);

  return <Client key={movie.id} computed={computed} movie={movie} secondaryDataPromise={secondaryDataPromise} />;
}

export const revalidate = 3600;
