import { notFound } from 'next/navigation';

import {
  createTitleDetailRoute,
  delayMediaSkeletonPreview,
  loadMediaRouteData,
} from '@/domains/media/server/title-route.server';
import { getMediaComputedData } from '@/domains/media/services/media-data';
import { getTvSeasonRatings, mergeTvSeasonRatings } from '@/domains/media/server/tv-season-ratings';
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

function getClientTvData(tv) {
  if (!tv || typeof tv !== 'object') {
    return tv;
  }

  const { aggregate_credits: _aggregateCredits, credits: _credits, ...clientTv } = tv;
  return clientTv;
}

export default async function TvDetailPage({ params, searchParams }) {
  await delayMediaSkeletonPreview(searchParams);
  const { id, media: tv, response } = await loadMediaRouteData(params, getTvBase);

  if (!tv || response.status === 404 || !isDisplayableTv(tv, 'detail')) {
    notFound();
  }

  const secondaryDataPromise = getTvSecondary(id).then(
    (secondaryResponse) => secondaryResponse?.data || {},
  );
  const ratingsPromise = Promise.all([getTvSeasonRatings(tv.id), secondaryDataPromise]).then(
    ([ratings, secondaryData]) =>
      mergeTvSeasonRatings({
        ratings,
        seasonDetails: secondaryData?.seasonDetails,
        seasons: tv.seasons,
      }),
  );

  return (
    <Client
      key={`tv-${tv.id}`}
      computed={getMediaComputedData(tv)}
      mediaType="tv"
      movie={getClientTvData(tv)}
      ratingsPromise={ratingsPromise}
      secondaryDataPromise={secondaryDataPromise}
    />
  );
}

export const revalidate = 3600;
