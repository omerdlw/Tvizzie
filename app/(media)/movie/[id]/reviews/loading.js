'use client';

import { MovieReviewsPageSkeleton } from '@/features/movie/skeletons';
import Registry from '../registry';

export default function Loading() {
  return (
    <>
      <Registry isLoading={true} />
      <MovieReviewsPageSkeleton />
    </>
  );
}
