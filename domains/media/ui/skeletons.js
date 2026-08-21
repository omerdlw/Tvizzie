'use client';

import { GridShellCrosshairs, GridCrosshair } from '@/domains/shell/layout/grid-crosshair';

const S = 'skeleton-block ';
const SOFT = 'skeleton-block-soft ';

export function PersonAwardsSkeleton() {
  return (
    <section className="relative w-full">
      {/* Hero Stat Dashboard Skeleton Header */}
      <div className="relative w-full p-6">
        <div className="flex w-full items-center justify-center gap-3 sm:gap-4">
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
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-px w-screen -translate-x-1/2 bg-white/10 backdrop-blur-sm">
          <GridShellCrosshairs />
        </div>
      </div>

      {/* Category / Filter Section Skeleton */}
      <section className="relative w-full">
        <div className="flex w-full flex-wrap items-center gap-2 p-4 sm:p-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`h-8 min-w-0 flex-auto ${SOFT}`} />
          ))}
        </div>

        {/* Full-width category bottom border line */}
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-px w-screen -translate-x-1/2 bg-white/10 backdrop-blur-sm">
          <GridShellCrosshairs />
        </div>
      </section>

      {/* Cards Skeleton */}
      <div className="w-full p-6">
        <div className="flex w-full flex-col gap-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-4 border border-white/10 bg-black/40 p-4"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className={`h-16 w-12 shrink-0 ${S}`} />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className={`h-4 w-12 ${SOFT}`} />
                  <div className={`h-4 w-28 ${SOFT}`} />
                </div>
                <div className={`h-5 w-44 ${S}`} />
                <div className={`h-3 w-32 ${SOFT}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-px w-screen -translate-x-1/2 bg-white/10 backdrop-blur-sm">
        <GridShellCrosshairs />
      </div>
    </section>
  );
}

export function PersonTimelineSkeleton() {
  return (
    <section className="relative w-full">
      <div className="p-6">
        <div className="relative mx-auto max-w-2xl">
          {/* Vertical Timeline Line */}
          <div className="absolute top-[18px] bottom-0 left-16 w-px bg-white/10 sm:left-24" />

          <div className="flex flex-col gap-8">
            {Array.from({ length: 4 }).map((_, yearIndex) => (
              <div key={yearIndex} className="relative flex">
                <div className="w-16 shrink-0 sm:w-24">
                  <div className={`mt-2 ml-auto h-5 w-10 ${S} sm:w-14`} />
                </div>

                {/* Timeline Dot */}
                <div className="absolute top-[18px] left-16 z-10 size-3 -translate-x-1/2 border-2 border-black bg-white/30 sm:left-24" />

                <div className="min-w-0 flex-1 space-y-3 pt-1 pl-4 sm:pl-8">
                  {Array.from({ length: yearIndex === 0 ? 2 : 1 }).map((_, itemIndex) => (
                    <div
                      key={itemIndex}
                      className="flex items-center gap-4 p-2"
                      style={{ animationDelay: `${(yearIndex * 2 + itemIndex) * 50}ms` }}
                    >
                      <div className={`h-24 w-16 shrink-0 ${S} sm:w-20`} />
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <div className={`h-5 w-48 ${S}`} />
                        <div className={`h-4 w-32 ${SOFT}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function TvSeasonRatingsSkeleton() {
  return (
    <section className="w-full">
      <div className="relative flex min-h-14 items-center justify-between gap-4 px-6">
        <div className="skeleton-block h-3 w-28" />
        <div className="skeleton-block-soft h-3 w-64" />
        <div className="pointer-events-none absolute right-px bottom-0 left-px h-px bg-white/10 backdrop-blur-sm">
          <GridCrosshair side="left" />
          <GridCrosshair side="right" />
        </div>
      </div>
      <div className="grid w-max grid-cols-[2rem_repeat(4,3.5rem)] gap-2 px-6 py-5 lg:mx-auto">
        <div />
        {[0, 1, 2, 3].map((index) => (
          <div key={`season-${index}`} className="skeleton-block-soft size-14" />
        ))}
        {[0, 1, 2, 3, 4, 5].flatMap((episode) => [
          <div key={`episode-${episode}`} className="skeleton-block-soft size-8 self-center" />,
          ...[0, 1, 2, 3].map((season) => (
            <div key={`${episode}-${season}`} className="skeleton-block size-14" />
          )),
        ])}
      </div>
    </section>
  );
}

export function MovieAwardsSkeleton() {
  return <PersonAwardsSkeleton />;
}

export default {
  MovieAwardsSkeleton,
  PersonAwardsSkeleton,
  PersonTimelineSkeleton,
  TvSeasonRatingsSkeleton,
};
