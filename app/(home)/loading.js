'use client'

import { Skeleton } from '@/ui/skeletons/views/home'
import Registry from './registry'

export default function Loading() {
  return (
    <>
      <Registry isLoading={true} />
      <Skeleton />
    </>
  )
}
