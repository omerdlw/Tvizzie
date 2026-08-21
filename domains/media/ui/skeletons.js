'use client';

import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/shared/constants';
import { GridShellCrosshairs, GridCrosshair } from '@/ui/layouts/grid-crosshair';
import NavHeightSpacer from '@/modules/nav/nav-height-spacer';
import { PageGradientShell } from '@/ui/layouts/page-gradient-shell';
import { PageGridFrame } from '@/ui/layouts/page-grid-frame';

const SKELETON = 'skeleton-block';
const SOFT_SKELETON = 'skeleton-block-soft';

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
              <div className={`h-8 w-14 ${SKELETON}`} />
              <div className={`mt-2 h-3 w-16 ${SOFT_SKELETON}`} />
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
            <div key={i} className={`h-8 min-w-0 flex-auto ${SOFT_SKELETON}`} />
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
              <div className={`h-16 w-12 shrink-0 ${SKELETON}`} />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className={`h-4 w-12 ${SOFT_SKELETON}`} />
                  <div className={`h-4 w-28 ${SOFT_SKELETON}`} />
                </div>
                <div className={`h-5 w-44 ${SKELETON}`} />
                <div className={`h-3 w-32 ${SOFT_SKELETON}`} />
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
                  <div className={`mt-2 ml-auto h-5 w-10 ${SKELETON} sm:w-14`} />
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
                      <div className={`h-24 w-16 shrink-0 ${SKELETON} sm:w-20`} />
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <div className={`h-5 w-48 ${SKELETON}`} />
                        <div className={`h-4 w-32 ${SOFT_SKELETON}`} />
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

function SkeletonLine({ className = '', soft = false }) {
  return <div className={`${soft ? SOFT_SKELETON : SKELETON} ${className}`} />;
}

function FullBleedRule({ edge = 'bottom' }) {
  return (
    <div
      className={`pointer-events-none absolute left-1/2 h-px w-screen -translate-x-1/2 bg-white/10 backdrop-blur-sm ${
        edge === 'top' ? 'top-0' : 'bottom-0'
      }`}
    >
      <GridShellCrosshairs />
    </div>
  );
}

function SegmentedControlSkeleton({ itemWidths = ['w-9', 'w-9'] }) {
  return (
    <div className="inline-flex shrink-0 items-stretch border border-white/10 p-[2px]">
      <div className="flex overflow-hidden">
        {itemWidths.map((width, index) => (
          <div
            key={`${width}-${index}`}
            className={`flex h-7 items-center px-3 ${index === 0 ? 'bg-primary' : ''}`}
          >
            <SkeletonLine className={`h-2 ${width}`} soft />
          </div>
        ))}
      </div>
    </div>
  );
}

function MediaSectionHeaderSkeleton({ controls = null, titleWidth = 'w-24' }) {
  return (
    <div className="relative flex min-h-14 w-full items-center justify-between gap-4 border-b border-white/10 px-6">
      <div className="flex min-w-0 items-center gap-2">
        <div className={`size-5 shrink-0 ${SKELETON}`} />
        <SkeletonLine className={`h-3 ${titleWidth}`} />
      </div>
      {controls}
    </div>
  );
}

function PersonSectionHeaderSkeleton({ controls = false }) {
  return (
    <div className="relative flex min-h-14 w-full items-center justify-between gap-4 px-6">
      <div className="flex min-w-0 items-center gap-2">
        <div className={`size-5 shrink-0 ${SKELETON}`} />
        <SkeletonLine className="h-3 w-24" />
      </div>
      {controls ? <SegmentedControlSkeleton itemWidths={['w-12', 'w-14']} /> : null}
      <FullBleedRule />
    </div>
  );
}

export function MediaRouteSkeletonShell({ children, minHeightClassName = 'min-h-dvh' }) {
  return (
    <PageGradientShell className="overflow-hidden">
      <PageGridFrame minHeightClassName={minHeightClassName} />
      <div
        className={`relative z-10 mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col pb-12`}
      >
        {children}
      </div>
      <NavHeightSpacer />
    </PageGradientShell>
  );
}

export function PersonHeroSkeleton() {
  return (
    <section className="relative flex w-full flex-col items-center gap-5 px-4 py-14 sm:gap-7 sm:py-20 lg:py-24">
      <div className="flex max-w-full items-center justify-center gap-3 sm:gap-4 lg:gap-5">
        <div className={`h-12 w-12 shrink-0 ${SKELETON} sm:h-16 sm:w-16 lg:h-20 lg:w-20`} />
        <div className={`h-12 w-44 ${SKELETON} sm:h-16 sm:w-64 lg:h-20 lg:w-80`} />
      </div>
      <div className="mx-auto flex w-full max-w-[72ch] flex-col items-center gap-2">
        <SkeletonLine className="h-4 w-full max-w-[50ch]" soft />
        <SkeletonLine className="h-4 w-[88%] max-w-[44ch]" soft />
        <SkeletonLine className="h-4 w-2/3 max-w-[32ch]" soft />
        <SkeletonLine className="h-4 w-1/2 max-w-[24ch]" soft />
        <SkeletonLine className="mt-3 h-3 w-16" soft />
      </div>
      <FullBleedRule />
    </section>
  );
}

export function PersonGallerySkeleton() {
  return (
    <section className="relative w-full">
      <PersonSectionHeaderSkeleton />
      <div className="grid grid-cols-3 gap-3 p-6 sm:grid-cols-4 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((index) => (
          <div key={index} className={`aspect-2/3 ${SKELETON}`} />
        ))}
      </div>
    </section>
  );
}

export function PersonFilmographySkeleton() {
  return (
    <section className="relative w-full">
      <FullBleedRule edge="top" />
      <PersonSectionHeaderSkeleton controls />
      <div className="grid grid-cols-3 gap-3 p-6 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <div key={index} className={`aspect-2/3 ${SKELETON}`} />
        ))}
      </div>
    </section>
  );
}

export function PersonDeferredContentSkeleton() {
  return (
    <>
      <PersonGallerySkeleton />
      <PersonFilmographySkeleton />
    </>
  );
}

export function MediaSidebarSkeleton() {
  return (
    <aside className="order-1 w-full shrink-0 self-start p-6 lg:sticky lg:top-6 lg:w-96">
      <div
        className={`mx-auto aspect-2/3 w-full max-w-[320px] ${SKELETON} sm:max-w-[360px] lg:max-w-none`}
      />
      <div className="mt-4 grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="flex h-11 items-center justify-center border border-white/10 bg-black/40 px-2.5"
          >
            <SkeletonLine className={`h-2 ${index % 2 ? 'w-14' : 'w-16'}`} soft />
          </div>
        ))}
      </div>
      <div className="mt-4">
        <SkeletonLine className="mb-2 h-2.5 w-24" soft />
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap gap-1.5">
            {['w-14', 'w-16'].map((width, index) => (
              <div key={index} className={`h-6 ${width} ${SOFT_SKELETON}`} />
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['w-16', 'w-20', 'w-14', 'w-16', 'w-14', 'w-20', 'w-16', 'w-24'].map(
              (width, index) => (
                <div key={index} className={`h-6 ${width} ${SOFT_SKELETON}`} />
              ),
            )}
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-2.5">
        {[0, 1, 2, 3, 4].map((index) => (
          <div key={index} className="flex items-center gap-2.5">
            <div className={`size-[18px] shrink-0 ${SOFT_SKELETON}`} />
            <SkeletonLine className={`h-3 ${index % 2 ? 'w-3/5' : 'w-4/5'}`} soft />
          </div>
        ))}
      </div>
    </aside>
  );
}

export function MediaHeroSkeleton() {
  return (
    <section className="flex min-h-[188px] w-full flex-col border-b border-white/10 p-6">
      <div className={`h-14 w-3/5 max-w-[20rem] ${SKELETON} sm:h-16`} />
      <SkeletonLine className="mt-4 h-3 w-48" />
      <div className="mt-3 max-w-[70ch] space-y-2">
        <SkeletonLine className="h-4 w-full" soft />
        <SkeletonLine className="h-4 w-11/12" soft />
        <SkeletonLine className="h-4 w-3/4" soft />
      </div>
    </section>
  );
}

function MediaCastCardSkeleton({ compact = false }) {
  return (
    <div
      className={`flex min-w-0 items-center gap-3 border border-white/10 backdrop-blur-sm ${
        compact ? 'h-10 flex-1 p-1 pr-2' : 'h-[84px] p-1 pr-4'
      }`}
    >
      <div className={`${SKELETON} shrink-0 ${compact ? 'h-8 w-8' : 'h-[76px] w-14'}`} />
      <div className="min-w-0 flex-1 space-y-2">
        <SkeletonLine className={`h-3 ${compact ? 'w-3/5' : 'w-3/4'}`} />
        {!compact ? <SkeletonLine className="h-2.5 w-1/2" soft /> : null}
      </div>
    </div>
  );
}

export function MediaCastSkeleton() {
  return (
    <section className="relative w-full border-b border-white/10">
      <MediaSectionHeaderSkeleton controls={<SegmentedControlSkeleton />} titleWidth="w-24" />
      <div className="p-6">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <MediaCastCardSkeleton key={index} />
          ))}
        </div>
        <div className="mt-2 flex h-10 items-center gap-2">
          <MediaCastCardSkeleton compact />
          <MediaCastCardSkeleton compact />
          <div className={`size-10 shrink-0 border border-white/10 ${SOFT_SKELETON}`} />
        </div>
      </div>
    </section>
  );
}

function MediaFeatureCardSkeleton({ episode = false }) {
  return (
    <div
      className={`relative aspect-video w-[min(18rem,calc(100vw-4.5rem))] shrink-0 overflow-hidden ${SKELETON} sm:w-72`}
    >
      {episode ? (
        <div className="absolute right-0 bottom-0 left-0 space-y-2 p-3">
          <SkeletonLine className="h-2 w-8" soft />
          <SkeletonLine className="h-3 w-3/5" />
        </div>
      ) : null}
    </div>
  );
}

export function MediaTvSeasonsSkeleton() {
  return (
    <section className="relative w-full border-b border-white/10">
      <MediaSectionHeaderSkeleton
        titleWidth="w-16"
        controls={
          <SegmentedControlSkeleton itemWidths={['w-3', 'w-3', 'w-3', 'w-3', 'w-3', 'w-3']} />
        }
      />
      <div className="flex gap-3 overflow-hidden p-6">
        {[0, 1, 2].map((index) => (
          <MediaFeatureCardSkeleton key={index} episode />
        ))}
      </div>
    </section>
  );
}

export function MediaFeatureSectionSkeleton({
  controls = null,
  titleWidth = 'w-16',
  video = false,
}) {
  return (
    <section className="relative w-full border-b border-white/10">
      <MediaSectionHeaderSkeleton
        controls={
          Array.isArray(controls) ? <SegmentedControlSkeleton itemWidths={controls} /> : controls
        }
        titleWidth={titleWidth}
      />
      <div className="flex gap-3 overflow-hidden p-6">
        {[0, 1, 2].map((index) => (
          <MediaFeatureCardSkeleton key={index} episode={video} />
        ))}
      </div>
    </section>
  );
}

function MediaDiscoveryCardSkeleton() {
  return (
    <div
      className={`aspect-2/3 w-36 shrink-0 ${SKELETON} sm:w-[calc((100%-24px)/3)] md:w-[calc((100%-36px)/4)]`}
    />
  );
}

export function MediaDiscoverySectionSkeleton({ hasBottomBorder = true, titleWidth = 'w-28' }) {
  return (
    <section className={`relative w-full ${hasBottomBorder ? 'border-b border-white/10' : ''}`}>
      <MediaSectionHeaderSkeleton titleWidth={titleWidth} />
      <div className="flex gap-3 overflow-hidden p-6">
        {[0, 1, 2, 3].map((index) => (
          <MediaDiscoveryCardSkeleton key={index} />
        ))}
      </div>
    </section>
  );
}

export function MediaReviewsSkeleton() {
  return (
    <section className="relative w-full">
      <div className="pointer-events-none absolute top-0 left-1/2 h-px w-screen -translate-x-1/2 bg-white/10 backdrop-blur-sm" />
      <div className="relative flex min-h-14 w-full items-center justify-between gap-4 p-6">
        <div className="flex min-w-0 items-center gap-2">
          <div className={`size-5 shrink-0 ${SKELETON}`} />
          <SkeletonLine className="h-3 w-28" />
        </div>
        <SkeletonLine className="h-7 w-24" soft />
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-px w-screen -translate-x-1/2 bg-white/10 backdrop-blur-sm" />
      </div>
      <div className="space-y-0 p-6">
        {[0, 1].map((index) => (
          <div
            key={index}
            className="flex gap-4 border-b border-white/10 py-4 first:pt-0 last:border-b-0 last:pb-0"
          >
            <div className={`h-20 w-14 shrink-0 ${SKELETON}`} />
            <div className="min-w-0 flex-1 space-y-2">
              <SkeletonLine className="h-3.5 w-36" />
              <SkeletonLine className="h-3 w-full" soft />
              <SkeletonLine className="h-3 w-4/5" soft />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
