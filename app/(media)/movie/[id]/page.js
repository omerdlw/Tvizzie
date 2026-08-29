import { createTitleDetailRoute } from '@/domains/media/server/title-route';
import { getMovieBase, getMovieSecondary } from '@/infrastructure/tmdb/server';
import { isDisplayableMovie } from '@/infrastructure/tmdb/server';
import { getMovieAwards } from '@/domains/media/server/movie-awards';

import MediaDetailView from '@/domains/media/ui/pages/media-detail';

const route = createTitleDetailRoute({
  View: MediaDetailView,
  fallbackTitle: 'Movie Not Found',
  getAwards: getMovieAwards,
  getBase: getMovieBase,
  getSecondary: getMovieSecondary,
  isDisplayable: isDisplayableMovie,
  mediaType: 'movie',
  openGraphType: 'video.movie',
});

export const { generateMetadata } = route;
export const revalidate = 3600;
export default route.Page;
