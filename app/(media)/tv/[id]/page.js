import { createTitleDetailRoute } from '@/domains/media/server/title-route.server';
import { getTvBase, getTvSecondary } from '@/infrastructure/tmdb/clients/tmdb-server-client';
import { isDisplayableTv } from '@/infrastructure/tmdb/clients/sanitize';

import Client from '@/app/(media)/tv/[id]/client';

const route = createTitleDetailRoute({
  Client,
  fallbackTitle: 'TV Series Not Found',
  getBase: getTvBase,
  getSecondary: getTvSecondary,
  isDisplayable: isDisplayableTv,
  mediaType: 'tv',
  openGraphType: 'video.tv_show',
});

export const { generateMetadata } = route;
export const revalidate = 3600;
export default route.Page;
