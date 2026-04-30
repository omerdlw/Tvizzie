'use client';

import { cn } from '@/core/utils';
import { SkeletonBlock, SkeletonLine } from '@/ui/skeletons/primitives';

export function Skeleton({ className }) {
  return (
    <div className={cn('flex h-auto w-full items-center gap-2', className)}>
      <SkeletonBlock className="size-12 shrink-0 " />
      <div className="h-full w-full space-y-2">
        <SkeletonLine size="lg" className="w-3/4" />
        <SkeletonLine size="sm" className="w-1/2" soft={true} />
      </div>
    </div>
  );
}
