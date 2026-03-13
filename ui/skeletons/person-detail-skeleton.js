'use client'

import { cn } from '@/lib/utils'
import { useNavHeight } from '@/modules/nav/hooks'

const Shimmer = ({ className }) => (
  <div className={cn('shimmer-wrapper', className)}>
    <div className="shimmer-effect" />
  </div>
)

function PosterCard() {
  return (
    <div className="relative h-86 w-64 overflow-hidden rounded-[50px] bg-white/5 ring-1 ring-white/15">
      <Shimmer className="absolute inset-0 bg-white/10" />
    </div>
  )
}

function StatPillSkeleton({ className }) {
  return (
    <div
      className={cn(
        'flex h-12 items-center gap-2 rounded-[20px] border border-white/10 bg-white/5 px-3 py-1 backdrop-blur-sm',
        className
      )}
    >
      <Shimmer className="size-6 shrink-0 rounded-full bg-white/10" />
      <Shimmer className="h-6 w-full rounded-full bg-white/10" />
    </div>
  )
}

function FilmographyCardSkeleton({ className }) {
  return (
    <div
      className={cn(
        'group flex w-[calc((100%-12px)/2)] shrink-0 flex-col gap-2 backdrop-blur-sm sm:w-[calc((100%-24px)/3)] md:w-[calc((100%-48px)/4)] lg:w-[calc((100%-48px)/5)]',
        className
      )}
    >
      <div className="relative aspect-2/3 w-full overflow-hidden rounded-[20px] bg-white/5 p-1 ring ring-white/10">
        <div className="relative h-full w-full overflow-hidden rounded-[16px] bg-white/10">
          <Shimmer className="absolute inset-0 bg-white/10" />
          <div className="absolute right-0 -bottom-px left-0 p-3 pt-8">
            <Shimmer className="h-3 w-4/5 rounded-full bg-white/20" />
            <div className="mt-1.5 flex items-center gap-1.5">
              <Shimmer className="h-2.5 w-2.5 rounded-full bg-white/20" />
              <Shimmer className="h-2.5 w-8 rounded-full bg-white/20" />
              <Shimmer className="h-2.5 w-8 rounded-full bg-white/20" />
            </div>
          </div>
        </div>
      </div>
      <Shimmer className="h-2.5 w-3/5 rounded-full bg-white/12" />
    </div>
  )
}

export function PersonDetailSkeleton({ className }) {
  const { navHeight } = useNavHeight()
  return (
    <div
      className={cn(
        'relative mx-auto flex h-auto w-full max-w-6xl flex-col items-center gap-4 p-3 select-none [overflow-anchor:none] sm:p-4 md:p-6',
        className
      )}
    >
      <div className="pointer-events-none fixed inset-0 -z-10 bg-linear-to-t from-black via-black/40 to-transparent" />

      <div className="mt-24 flex w-full flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-6">
          <PosterCard />
          <div className="flex flex-col items-center gap-2 space-y-2 text-center">
            <Shimmer className="h-12 w-64 rounded-2xl bg-white/12 sm:h-14 sm:w-80 md:h-16 md:w-96" />
            <Shimmer className="h-7 w-32 rounded-full border border-white/10 bg-white/8" />
          </div>
        </div>

        <div className="flex w-full max-w-3xl flex-wrap items-center justify-center gap-3">
          <StatPillSkeleton className="w-[142px]" />
          <StatPillSkeleton className="w-[280px]" />
        </div>

        <div className="flex items-center gap-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Shimmer
              key={index}
              className="size-10 rounded-full bg-white/10 ring-1 ring-white/10"
            />
          ))}
        </div>

        <div className="w-full max-w-3xl space-y-3">
          <Shimmer className="h-4 w-full rounded-full bg-white/10" />
          <Shimmer className="h-4 w-full rounded-full bg-white/10" />
          <Shimmer className="h-4 w-[94%] rounded-full bg-white/10" />
          <Shimmer className="h-4 w-[80%] rounded-full bg-white/10" />
          <Shimmer className="h-3 w-20 rounded-full bg-white/12" />
        </div>

        <div className="-m-1 flex w-full flex-col gap-3 pb-10">
          <Shimmer className="ml-1 h-3 w-24 rounded-full bg-white/12" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 5 }).map((_, index) => (
              <FilmographyCardSkeleton key={index} />
            ))}
          </div>
        </div>
        <div className="-m-1 flex w-full flex-col gap-3 pb-10">
          <Shimmer className="ml-1 h-3 w-24 rounded-full bg-white/12" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 5 }).map((_, index) => (
              <FilmographyCardSkeleton key={index} />
            ))}
          </div>
        </div>
        <div className="-m-1 flex w-full flex-col gap-3 pb-10">
          <Shimmer className="ml-1 h-3 w-24 rounded-full bg-white/12" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 5 }).map((_, index) => (
              <FilmographyCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
      <div
        style={{
          height: navHeight,
        }}
      ></div>
    </div>
  )
}
