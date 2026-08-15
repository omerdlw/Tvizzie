import { createTitleReviewsRoute } from '@/domains/media/server/title-route.server';
import { getMovieBase, getMovieSecondary } from '@/infrastructure/tmdb/clients/tmdb-server-client';
import { isDisplayableMovie } from '@/infrastructure/tmdb/clients/sanitize';

import Client from '@/app/(media)/movie/[id]/reviews/client';

const route = createTitleReviewsRoute({
  Client,
  fallbackTitle: 'Movie Reviews Not Found',
  getBase: getMovieBase,
  getSecondary: getMovieSecondary,
  isDisplayable: isDisplayableMovie,
  mediaType: 'movie',
});

export const { generateMetadata } = route;
export const revalidate = 3600;
export default route.Page;
