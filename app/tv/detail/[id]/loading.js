'use client'

import { TvRegistry } from '@/components/tv/tv-registry'
import { MediaDetailSkeleton } from '@/ui/skeletons/media-detail-skeleton'

export default function Loading() {
  return (
    <>
      <TvRegistry isLoading={true} />
      <MediaDetailSkeleton />
    </>
  )
}
