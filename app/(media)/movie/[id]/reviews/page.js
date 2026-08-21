import { createTitleReviewsRoute } from '@/domains/media/server/title-route';
import { getMovieBase, getMovieSecondary } from '@/infrastructure/tmdb/clients/tmdb-server-client';
import { isDisplayableMovie } from '@/infrastructure/tmdb/clients/sanitize';

import MediaReviewsView from '@/domains/media/ui/pages/media-reviews';

const route = createTitleReviewsRoute({
  View: MediaReviewsView,
  fallbackTitle: 'Movie Reviews Not Found',
  getBase: getMovieBase,
  getSecondary: getMovieSecondary,
  isDisplayable: isDisplayableMovie,
  mediaType: 'movie',
});

export const { generateMetadata } = route;
export const revalidate = 3600;
export default route.Page;
