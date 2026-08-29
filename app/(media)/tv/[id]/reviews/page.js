import { createTitleReviewsRoute } from '@/domains/media/server/title-route';
import { getTvBase, getTvSecondary } from '@/infrastructure/tmdb/server';
import { isDisplayableTv } from '@/infrastructure/tmdb/server';

import MediaReviewsView from '@/domains/media/ui/pages/media-reviews';

const route = createTitleReviewsRoute({
  View: MediaReviewsView,
  fallbackTitle: 'TV Reviews Not Found',
  getBase: getTvBase,
  getSecondary: getTvSecondary,
  isDisplayable: isDisplayableTv,
  mediaType: 'tv',
});

export const { generateMetadata } = route;
export const revalidate = 3600;
export default route.Page;
