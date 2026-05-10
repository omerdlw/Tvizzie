'use client';

import { Skeleton } from '@/features/movie/skeletons';
import Registry from './registry';

export default function Loading() {
  return (
    <>
      <Registry isLoading={true} />
      <Skeleton />
    </>
  );
}
