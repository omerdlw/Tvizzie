'use client';

import Icon from '@/ui/primitives/icon';

const S = 'skeleton-block ';
const SOFT = 'skeleton-block-soft ';

export default function PersonTimelineSkeleton() {
  return (
    <section className="relative w-full">
      <div className="relative flex min-h-14 w-full items-center justify-between gap-4 px-6">
        <div className="flex min-w-0 items-center gap-2">
          <Icon icon="solar:sort-by-time-bold" size={24} className="text-black/70" />
          <h2 className="min-w-0 text-xs font-semibold tracking-widest text-black/70 uppercase">
            Timeline
          </h2>
        </div>
        <div className="pointer-events-none absolute bottom-0 left-1/2 w-screen -translate-x-1/2 border-b border-black/10" />
      </div>

      <div className="p-6">
        <div className="relative">
          {/* Vertical Timeline Line */}
          <div className="absolute top-[18px] bottom-0 left-16 w-px bg-black/10 sm:left-24" />

          <div className="flex flex-col gap-8">
            {Array.from({ length: 4 }).map((_, yearIndex) => (
              <div key={yearIndex} className="relative flex">
                <div className="w-16 shrink-0 sm:w-24">
                  <div className={`mt-2 ml-auto h-5 w-10 ${S} sm:w-14`} />
                </div>

                {/* Timeline Dot */}
                <div className="absolute top-[18px] left-16 z-10 size-3 -translate-x-1/2 border-2 border-white bg-black/30 sm:left-24" />

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
      <div className="pointer-events-none absolute bottom-0 left-1/2 w-screen -translate-x-1/2 border-b border-black/10" />
    </section>
  );
}
