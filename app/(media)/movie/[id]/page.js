import { createTitleDetailRoute } from '@/domains/media/server/title-route.server';
import { getMovieBase, getMovieSecondary } from '@/infrastructure/tmdb/clients/tmdb-server-client';
import { isDisplayableMovie } from '@/infrastructure/tmdb/clients/sanitize';

import Client from '@/app/(media)/movie/[id]/client';

const route = createTitleDetailRoute({
  Client,
  fallbackTitle: 'Movie Not Found',
  getBase: getMovieBase,
  getSecondary: getMovieSecondary,
  isDisplayable: isDisplayableMovie,
  mediaType: 'movie',
  openGraphType: 'video.movie',
});

export const { generateMetadata } = route;
export const revalidate = 3600;
export default route.Page;
