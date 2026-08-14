'use client';

import Icon from '@/ui/primitives/icon';

const S = 'skeleton-block ';
const SOFT = 'skeleton-block-soft ';

export default function PersonAwardsSkeleton() {
  return (
    <section className="relative w-full">
      {/* Hero Stat Dashboard Skeleton Header */}
      <div className="relative w-full pt-2 pb-6 sm:pt-3 sm:pb-8">
        <div className="mx-auto flex max-w-[72ch] items-center justify-center gap-3 px-6 sm:gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex h-24 min-w-[110px] flex-1 flex-col items-center justify-center border border-white/10 bg-black/40 p-4 backdrop-blur-md"
            >
              <div className={`h-8 w-14 ${S}`} />
              <div className={`mt-2 h-3 w-16 ${SOFT}`} />
            </div>
          ))}
        </div>

        {/* Full-width hero bottom border line */}
        <div className="pointer-events-none absolute bottom-0 left-1/2 w-screen -translate-x-1/2 border-b border-white/10" />
      </div>

      <div className="p-6">
        {/* Filter Pills Skeleton */}
        <div className="mx-auto mt-6 flex max-w-[72ch] flex-wrap items-center justify-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`h-8 w-20 ${SOFT} `} />
          ))}
        </div>

        {/* Cards Skeleton */}
        <div className="mx-auto mt-8 flex max-w-[72ch] flex-col gap-3 sm:mt-10">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-4 border border-white/10 bg-black/40 p-4"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className={`h-16 w-12 shrink-0 ${S}`} />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className={`h-5 w-40 ${S}`} />
                  <div className={`h-4 w-12 ${SOFT}`} />
                </div>
                <div className={`h-4 w-56 ${SOFT}`} />
                <div className={`h-3 w-24 ${SOFT}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-0 left-1/2 w-screen -translate-x-1/2 border-b border-white/10" />
    </section>
  );
}
