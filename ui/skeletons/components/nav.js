'use client'

import { cn } from '@/core/utils'

const SkeletonBlock = ({ className }) => <div className={className} />

export function Skeleton({ className }) {
  return (
    <div className={cn('flex h-auto w-full items-center gap-2', className)}>
      <SkeletonBlock className="size-12 rounded-[12px] shrink-0 bg-white/10" />
      <div className="w-full h-full space-y-2">
        <SkeletonBlock className="h-4 w-3/4 rounded-full bg-white/10" />
        <SkeletonBlock className="h-3 w-1/2 rounded-full bg-white/10" />
      </div>
    </div>
  )
}
