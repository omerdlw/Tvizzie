'use client'

import { MovieRegistry } from '@/components/movie/movie-registry'
import { MediaDetailSkeleton } from '@/ui/skeletons/media-detail-skeleton'

export default function Loading() {
  return (
    <>
      <MovieRegistry isLoading={true} />
      <MediaDetailSkeleton />
    </>
  )
}
