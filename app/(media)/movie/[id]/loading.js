'use client';

import MediaRegistry from '@/domains/media/ui/registry';
import {
  MediaCastSkeleton,
  MediaDiscoverySectionSkeleton,
  MediaFeatureSectionSkeleton,
  MediaHeroSkeleton,
  MediaReviewsSkeleton,
  MediaRouteSkeletonShell,
  MediaSidebarSkeleton,
} from '@/domains/media/ui/skeletons';

function MovieDetailSkeleton() {
  return (
    <MediaRouteSkeletonShell>
      <div className="relative flex w-full flex-col items-start lg:flex-row lg:items-start">
        <MediaSidebarSkeleton />
        <main className="order-2 flex w-full min-w-0 flex-col self-start lg:flex-1 lg:border-l lg:border-white/10">
          <MediaHeroSkeleton />
          <MediaCastSkeleton />
          <MediaFeatureSectionSkeleton titleWidth="w-16" />
          <MediaFeatureSectionSkeleton controls={['w-16', 'w-12', 'w-10']} titleWidth="w-16" />
          <MediaFeatureSectionSkeleton
            controls={['w-16', 'w-12', 'w-16', 'w-10']}
            titleWidth="w-14"
            video
          />
          <MediaDiscoverySectionSkeleton titleWidth="w-24" />
          <MediaDiscoverySectionSkeleton hasBottomBorder={false} titleWidth="w-28" />
        </main>
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
