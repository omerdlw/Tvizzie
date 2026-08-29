'use client';

import MediaRegistry from '@/domains/media/ui/registry';
import {
  MediaBackdropSkeleton,
  MediaCastSkeleton,
  MediaGallerySkeleton,
  MediaHeroSkeleton,
  MediaImagesSkeleton,
  MediaRecommendationsSkeleton,
  MediaReviewsSkeleton,
  MediaRouteSkeletonShell,
  MediaSidebarSkeleton,
  MediaVideosSkeleton,
} from '@/domains/media/ui/skeletons';
import { MEDIA_DETAIL_STACK_CLASS } from '@/domains/media/ui/layouts/media-detail-section';

function MovieDetailSkeleton() {
  return (
    <MediaRouteSkeletonShell>
      <MediaBackdropSkeleton />
      <div className="relative w-full -mt-24 sm:-mt-36 lg:-mt-52 grid grid-cols-1 items-start gap-8 lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <MediaSidebarSkeleton />
        <div className="flex w-full min-w-0 flex-col lg:w-auto">
          <div className="flex w-full flex-col">
            <MediaHeroSkeleton />
            <div className={MEDIA_DETAIL_STACK_CLASS}>
              <MediaCastSkeleton />
              <MediaGallerySkeleton />
              <MediaImagesSkeleton />
              <MediaVideosSkeleton />
              <MediaRecommendationsSkeleton titleWidth="w-24" />
              <MediaRecommendationsSkeleton titleWidth="w-28" />
            </div>
          </div>
        </div>
      </div>
      <MediaReviewsSkeleton />
    </MediaRouteSkeletonShell>
  );
}

export default function Loading() {
  return (
    <>
      <MediaRegistry isLoading={true} />
      <MovieDetailSkeleton />
    </>
  );
}
