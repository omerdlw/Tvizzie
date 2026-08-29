'use client';

import MediaRegistry from '@/domains/media/ui/registry';
import {
  MediaRouteSkeletonShell,
  PersonDeferredContentSkeleton,
  PersonHeroSkeleton,
} from '@/domains/media/ui/skeletons';

function PersonDetailSkeleton() {
  return (
    <MediaRouteSkeletonShell minHeightClassName="min-h-screen">
      <div className="relative flex w-full flex-col items-center pt-8 sm:pt-12 lg:pt-16">
        <PersonHeroSkeleton />
        <PersonDeferredContentSkeleton />
      </div>
    </MediaRouteSkeletonShell>
  );
}

export default function Loading() {
  return (
    <>
      <MediaRegistry isLoading={true} />
      <PersonDetailSkeleton />
    </>
  );
}
