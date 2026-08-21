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
      <PersonHeroSkeleton />
      <PersonDeferredContentSkeleton />
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
