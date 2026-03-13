'use client'

import { cn } from '@/lib/utils'
import { useNavHeight } from '@/modules/nav/hooks'

const Shimmer = ({ className }) => (
  <div className={cn('shimmer-wrapper', className)}>
    <div className="shimmer-effect" />
  </div>
)

function ProfileMediaCardSkeleton() {
  return (
    <div className="flex w-full flex-col gap-2.5">
      <div className="relative aspect-2/3 w-full overflow-hidden rounded-[20px] bg-white/5 p-1 ring-1 ring-white/10">
        <div className="relative h-full w-full overflow-hidden rounded-[16px] bg-white/10">
          <Shimmer className="absolute inset-0 bg-white/10" />
          <div className="absolute right-0 bottom-0 left-0 p-3 pt-8">
            <Shimmer className="h-3 w-4/5 rounded bg-white/20" />
            <div className="mt-1.5 flex items-center gap-1.5">
              <Shimmer className="h-2.5 w-2.5 rounded-full bg-white/20" />
              <Shimmer className="h-2.5 w-8 rounded bg-white/20" />
              <Shimmer className="h-2.5 w-8 rounded bg-white/20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ProfileDetailSkeleton({ className }) {
  const { navHeight } = useNavHeight()

  return (
    <div
      className={cn(
        'relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-8 p-3 select-none [overflow-anchor:none] sm:p-4 md:p-6',
        className
      )}
    >
      <div className="pointer-events-none fixed inset-0 -z-10 bg-linear-to-t from-black via-black/40 to-transparent" />
      <section className="relative mx-auto mt-6 w-full max-w-4xl sm:mt-12">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-12 md:gap-16">
          <div className="relative shrink-0">
            <div className="absolute -inset-1.5 rounded-full bg-linear-to-tr from-white/20 via-white/5 to-white/15 blur-[2px]" />
            <Shimmer className="relative size-[100px] rounded-full bg-white/10 ring-[3px] ring-white/15 sm:size-[150px]" />
          </div>

          <div className="flex min-w-0 flex-1 flex-col items-center gap-5 sm:items-start sm:pt-2">
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <Shimmer className="h-10 w-64 rounded-2xl bg-white/10" />
              <Shimmer className="h-5 w-40 rounded-full bg-white/10" />
            </div>

            <div className="flex items-center gap-6 sm:gap-10">
              <Shimmer className="h-4 w-24 rounded-full bg-white/10" />
              <Shimmer className="h-4 w-24 rounded-full bg-white/10" />
              <Shimmer className="h-4 w-24 rounded-full bg-white/10" />
            </div>
          </div>
        </div>

        <div className="relative mt-10 border-t border-white/10 sm:mt-16">
          <div className="absolute top-0 left-0 h-[2px] w-1/3 bg-white/85" />
          <div className="grid grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-center gap-2 py-4"
              >
                <Shimmer
                  className={cn(
                    'size-3 rounded-full',
                    index === 0 ? 'bg-white/20' : 'bg-white/10'
                  )}
                />
                <Shimmer
                  className={cn(
                    'hidden h-2.5 rounded sm:block',
                    index === 0 ? 'w-20 bg-white/20' : 'w-18 bg-white/10'
                  )}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full pb-8">
        <div className="flex items-center justify-between gap-4">
          <Shimmer className="h-3 w-22 rounded-full bg-white/10" />
          <Shimmer className="h-7 w-32 rounded-full bg-white/10 ring-1 ring-white/10" />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:gap-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <ProfileMediaCardSkeleton key={index} />
          ))}
        </div>
      </section>

      <div style={{ height: navHeight }} />
    </div>
  )
}
