'use client';

import { MovieReviewsPageSkeleton } from '@/ui/skeletons/views/movie';
import Registry from '../registry';

export default function Loading() {
  return (
    <>
      <Registry isLoading={true} />
      <MovieReviewsPageSkeleton />
    </>
  );
}
