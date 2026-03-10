'use client'

import { cn } from '@/lib/utils'

const Shimmer = ({ className }) => (
  <div className={cn('shimmer-wrapper', className)}>
    <div className="shimmer-effect" />
  </div>
)

export function NavItemSkeleton({ className }) {
  return (
    <div className={cn('flex h-auto w-full items-center gap-3', className)}>
      <Shimmer className="size-12 shrink-0 rounded-[20px] bg-white/15" />
      <div className="flex flex-1 flex-col space-y-2 overflow-hidden">
        <Shimmer className="h-4 w-3/4 rounded-full bg-white/15" />
        <Shimmer className="h-3 w-1/2 rounded-full bg-white/15" />
      </div>
    </div>
  )
}
