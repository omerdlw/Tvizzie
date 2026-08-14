'use client';

import { Spinner } from '@/ui/feedback/spinner';
import SkeletonScene from '@/ui/motion/skeleton-scene';

export default function Loading() {
  return (
    <SkeletonScene className="flex min-h-[50vh] items-center justify-center py-12">
      <Spinner size={32} />
    </SkeletonScene>
  );
}
