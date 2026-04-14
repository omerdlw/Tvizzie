'use client';

import { cn } from '@/core/utils';

const BLOCK = 'skeleton-block';
const BLOCK_SOFT = 'skeleton-block-soft';

const SkeletonBlock = ({ className }) => <div className={className} />;

export function Skeleton({ className }) {
  return (
    <div className={cn('flex h-auto w-full items-center gap-2', className)}>
      <SkeletonBlock className={cn(BLOCK, 'size-12 shrink-0')} />
      <div className="h-full w-full space-y-2">
        <SkeletonBlock className={cn(BLOCK, 'h-4 w-3/4')} />
        <SkeletonBlock className={cn(BLOCK_SOFT, 'h-3 w-1/2')} />
      </div>
    </div>
  );
}
