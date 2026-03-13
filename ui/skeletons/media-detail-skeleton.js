'use client'

import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

const Shimmer = ({ className }) => (
  <div className={cn('shimmer-wrapper', className)}>
    <div className="shimmer-effect" />
  </div>
)

export function MediaDetailSkeleton({ className }) {
  const pathname = usePathname()
  const isTv = pathname?.includes('/tv/')

  return (
    <div
      className={cn(
        'relative mx-auto flex h-auto w-full max-w-6xl flex-col gap-4 p-3 select-none sm:p-4 md:p-6',
        className
      )}
    >
      <div className="pointer-events-none fixed inset-0 -z-10 bg-linear-to-t from-black via-black/40 to-transparent" />

      <div className="mt-8 flex h-auto w-full flex-col items-start gap-6 sm:mt-12 lg:mt-20 lg:flex-row lg:gap-12">
        <div className="w-full self-start lg:sticky lg:top-6 lg:w-[400px]">
          <div className="flex flex-col gap-6">
            <Shimmer className="relative aspect-2/3 w-full overflow-hidden rounded-[20px] bg-white/5 ring-1 ring-white/5 lg:h-[600px] lg:w-[400px]" />
            <div className="flex flex-col gap-1.5 px-2">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5">
                  <Shimmer className="h-4.5 w-4.5 shrink-0 rounded-[4px] bg-white/5" />
                  <Shimmer className="h-4 w-3/4 rounded-[4px] bg-white/5" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex w-full min-w-0 flex-col">
          <Shimmer className="h-14 w-full rounded-2xl bg-white/10 sm:h-20 sm:w-3/4 md:h-24 lg:h-28" />

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Shimmer className="h-8 w-8 rounded-[6px] bg-white/5" />
            <div className="flex items-center gap-2">
              <Shimmer className="h-6 w-12 rounded-[6px] bg-white/5" />
              <Shimmer className="h-6 w-20 rounded-full bg-white/5 ring-1 ring-white/5" />
              <Shimmer className="h-6 w-24 rounded-full bg-white/5 ring-1 ring-white/5" />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {[...Array(6)].map((_, i) => (
              <Shimmer
                key={i}
                className="h-4.5 w-16 rounded-full bg-white/5 ring-1 ring-white/5"
              />
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-4">
            <Shimmer className="h-3 w-1/2 rounded bg-white/5" />
            <div className="flex flex-col gap-3">
              <Shimmer className="h-4 w-full rounded bg-white/5" />
              <Shimmer className="h-4 w-full rounded bg-white/5" />
              <Shimmer className="h-4 w-[95%] rounded bg-white/5" />
              <Shimmer className="h-4 w-[85%] rounded bg-white/5" />
              <Shimmer className="h-4 w-[60%] rounded bg-white/5" />
            </div>
          </div>

          {isTv && (
            <div className="mt-12 flex flex-col gap-4">
              <Shimmer className="h-3 w-24 rounded bg-white/5" />
              <div className="flex gap-3 overflow-hidden">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="flex w-[calc((100%-12px)/2)] shrink-0 flex-col sm:w-[calc((100%-24px)/3)]"
                  >
                    <Shimmer className="aspect-2/3 w-full rounded-[20px] bg-white/5 ring-1 ring-white/5" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-12 flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <Shimmer className="h-3 w-32 rounded bg-white/5" />
              <Shimmer className="h-3 w-16 rounded bg-white/5" />
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 rounded-[20px] bg-white/5 p-1 pr-4 ring-1 ring-white/5"
                >
                  <Shimmer className="h-20 w-16 shrink-0 rounded-[16px] bg-white/5" />
                  <div className="flex flex-col gap-2">
                    <Shimmer className="h-3.5 w-32 rounded bg-white/5" />
                    <Shimmer className="h-2.5 w-20 rounded bg-white/5" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {[...Array(2)].map((_, sectionIdx) => (
            <div key={sectionIdx} className="mt-12 flex flex-col gap-4">
              <div className="flex w-fit items-center gap-1.5 rounded-[12px] bg-white/5 p-1 ring-1 ring-white/5">
                <Shimmer className="h-7 w-20 rounded-[10px] bg-white/5" />
                <Shimmer className="h-7 w-20 rounded-[10px] bg-white/5" />
                <Shimmer className="h-7 w-20 rounded-[10px] bg-white/5" />
              </div>
              <div className="flex gap-3 overflow-hidden">
                {[...Array(3)].map((_, i) => (
                  <Shimmer
                    key={i}
                    className="aspect-video w-72 shrink-0 rounded-[20px] bg-white/5 ring-1 ring-white/5"
                  />
                ))}
              </div>
            </div>
          ))}

          {[...Array(2)].map((_, sectionIdx) => (
            <div key={sectionIdx + 10} className="mt-12 flex flex-col gap-4">
              <Shimmer className="ml-1 h-3 w-32 rounded bg-white/5" />
              <div className="flex gap-4 overflow-hidden">
                {[...Array(4)].map((_, i) => (
                  <Shimmer
                    key={i}
                    className="aspect-2/3 w-[calc((100%-12px)/2)] shrink-0 rounded-[30px] bg-white/5 ring-1 ring-white/5 sm:w-[calc((100%-24px)/3)] md:w-[calc((100%-48px)/4)]"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
