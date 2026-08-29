import { notFound } from 'next/navigation';

import {
  createTitleDetailRoute,
  delayMediaSkeletonPreview,
  loadMediaRouteData,
} from '@/domains/media/server/title-route';
import { getTvSeasonRatings, mergeTvSeasonRatings } from '@/domains/media/server/tv-season-ratings';
import { getMediaComputedData } from '@/domains/media/utils/media-data';
import { getTvBase, getTvSecondary } from '@/infrastructure/tmdb/server';
import { isDisplayableTv } from '@/infrastructure/tmdb/server';

import { getTvAwards } from '@/domains/media/server/movie-awards';
import MediaDetailView from '@/domains/media/ui/pages/media-detail';

const route = createTitleDetailRoute({
  View: MediaDetailView,
  fallbackTitle: 'TV Series Not Found',
  getAwards: getTvAwards,
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
  const awardsPromise = getTvAwards(tv.id).catch(() => null);

  return (
    <MediaDetailView
      key={`tv-${tv.id}`}
      awardsPromise={awardsPromise}
      computed={getMediaComputedData(tv)}
      mediaType="tv"
      movie={getClientTvData(tv)}
      ratingsPromise={ratingsPromise}
      secondaryDataPromise={secondaryDataPromise}
    />
  );
}

export const revalidate = 3600;
