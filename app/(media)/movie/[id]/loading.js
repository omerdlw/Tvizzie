'use client';

import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/shared/constants';
import MediaGridFrame from '@/domains/media/ui/layouts/media-grid-frame';
import NavHeightSpacer from '@/ui/layout/nav-height-spacer';
import { PageGradientShell } from '@/ui/layout/page-gradient-shell';
import Registry from '@/app/(media)/registry';
import SkeletonScene from '@/ui/motion/skeleton-scene';

const SKELETON = 'skeleton-block';
const SOFT_SKELETON = 'skeleton-block-soft';

function Line({ className = '', soft = false }) {
  return <div className={`${soft ? SOFT_SKELETON : SKELETON} ${className}`} />;
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
            <Line className={`h-2 ${width}`} soft />
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionHeaderSkeleton({ controls = null, titleWidth = 'w-24' }) {
  return (
    <div className="relative flex min-h-14 w-full items-center justify-between gap-4 border-b border-white/10 px-6">
      <div className="flex min-w-0 items-center gap-2">
        <div className={`size-5 shrink-0 ${SKELETON}`} />
        <Line className={`h-3 ${titleWidth}`} />
      </div>
      {controls}
    </div>
  );
}

function MediaSidebarSkeleton() {
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
            <Line className={`h-2 ${index % 2 ? 'w-14' : 'w-16'}`} soft />
          </div>
        ))}
      </div>

      <div className="mt-4">
        <Line className="mb-2 h-2.5 w-24" soft />
        <div className="flex flex-wrap gap-1.5">
          {['w-14', 'w-12', 'w-16', 'w-20', 'w-14', 'w-16', 'w-14', 'w-20', 'w-16', 'w-24'].map(
            (width, index) => (
              <div key={index} className={`h-6 ${width} ${SOFT_SKELETON}`} />
            ),
          )}
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {[0, 1, 2, 3, 4].map((index) => (
          <div key={index} className="flex items-center gap-2.5">
            <div className={`size-[18px] shrink-0 ${SOFT_SKELETON}`} />
            <Line className={`h-3 ${index % 2 ? 'w-3/5' : 'w-4/5'}`} soft />
          </div>
        ))}
      </div>
    </aside>
  );
}

function MediaHeroSkeleton() {
  return (
    <section className="flex min-h-[188px] w-full flex-col border-b border-white/10 p-6">
      <div className={`h-14 w-3/5 max-w-[20rem] ${SKELETON} sm:h-16`} />
      <Line className="mt-4 h-3 w-48" />
      <div className="mt-3 max-w-[70ch] space-y-2">
        <Line className="h-4 w-full" soft />
        <Line className="h-4 w-11/12" soft />
        <Line className="h-4 w-3/4" soft />
      </div>
    </section>
  );
}

function CastCardSkeleton({ compact = false }) {
  return (
    <div
      className={`flex min-w-0 items-center gap-3 border border-white/10 backdrop-blur-sm ${
        compact ? 'h-10 flex-1 p-1 pr-2' : 'h-[84px] p-1 pr-4'
      }`}
    >
      <div className={`${SKELETON} shrink-0 ${compact ? 'h-8 w-8 ' : 'h-[76px] w-14 '}`} />
      <div className="min-w-0 flex-1 space-y-2">
        <Line className={`h-3 ${compact ? 'w-3/5' : 'w-3/4'}`} />
        {!compact ? <Line className="h-2.5 w-1/2" soft /> : null}
      </div>
    </div>
  );
}

function CastSkeleton() {
  return (
    <section className="relative w-full border-b border-white/10">
      <SectionHeaderSkeleton controls={<SegmentedControlSkeleton />} titleWidth="w-24" />
      <div className="p-6">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <CastCardSkeleton key={index} />
          ))}
        </div>
        <div className="mt-2 flex h-10 items-center gap-2">
          <CastCardSkeleton compact />
          <CastCardSkeleton compact />
          <div className={`size-10 shrink-0 border border-white/10 ${SOFT_SKELETON}`} />
        </div>
      </div>
    </section>
  );
}

function FeatureCardSkeleton({ episode = false }) {
  return (
    <div
      className={`relative aspect-video w-[min(18rem,calc(100vw-4.5rem))] shrink-0 overflow-hidden ${SKELETON} sm:w-72`}
    >
      {episode ? (
        <div className="absolute right-0 bottom-0 left-0 space-y-2 p-3">
          <Line className="h-2 w-8" soft />
          <Line className="h-3 w-3/5" />
        </div>
      ) : null}
    </div>
  );
}

function TvSeasonsSkeleton() {
  return (
    <section className="relative w-full border-b border-white/10">
      <SectionHeaderSkeleton
        titleWidth="w-16"
        controls={
          <SegmentedControlSkeleton itemWidths={['w-3', 'w-3', 'w-3', 'w-3', 'w-3', 'w-3']} />
        }
      />
      <div className="flex gap-3 overflow-hidden p-6">
        {[0, 1, 2].map((index) => (
          <FeatureCardSkeleton key={index} episode />
        ))}
      </div>
    </section>
  );
}

function FeatureSectionSkeleton({ controls = null, titleWidth = 'w-16', video = false }) {
  return (
    <section className="relative w-full border-b border-white/10">
      <SectionHeaderSkeleton controls={controls} titleWidth={titleWidth} />
      <div className="flex gap-3 overflow-hidden p-6">
        {[0, 1, 2].map((index) => (
          <FeatureCardSkeleton key={index} episode={video} />
        ))}
      </div>
    </section>
  );
}

function DiscoveryCardSkeleton() {
  return (
    <div
      className={`aspect-2/3 w-36 shrink-0 ${SKELETON} sm:w-[calc((100%-24px)/3)] md:w-[calc((100%-36px)/4)]`}
    />
  );
}

function DiscoverySectionSkeleton({ hasBottomBorder = true, titleWidth = 'w-28' }) {
  return (
    <section className={`relative w-full ${hasBottomBorder ? 'border-b border-white/10' : ''}`}>
      <SectionHeaderSkeleton titleWidth={titleWidth} />
      <div className="flex gap-3 overflow-hidden p-6">
        {[0, 1, 2, 3].map((index) => (
          <DiscoveryCardSkeleton key={index} />
        ))}
      </div>
    </section>
  );
}

function ReviewsSkeleton() {
  return (
    <section className="relative w-full">
      <div className="pointer-events-none absolute top-0 left-1/2 w-screen -translate-x-1/2 border-t border-white/10" />
      <div className="relative flex min-h-14 w-full items-center justify-between gap-4 p-6">
        <div className="flex min-w-0 items-center gap-2">
          <div className={`size-5 shrink-0 ${SKELETON}`} />
          <Line className="h-3 w-28" />
        </div>
        <Line className="h-7 w-24" soft />
        <div className="pointer-events-none absolute bottom-0 left-1/2 w-screen -translate-x-1/2 border-b border-white/10" />
      </div>
      <div className="space-y-0 p-6">
        {[0, 1].map((index) => (
          <div
            key={index}
            className="flex gap-4 border-b border-white/10 py-4 first:pt-0 last:border-b-0 last:pb-0"
          >
            <div className={`h-20 w-14 shrink-0 ${SKELETON}`} />
            <div className="min-w-0 flex-1 space-y-2">
              <Line className="h-3.5 w-36" />
              <Line className="h-3 w-full" soft />
              <Line className="h-3 w-4/5" soft />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function MediaDetailRouteSkeleton({ mediaType = 'movie' }) {
  return (
    <PageGradientShell className="overflow-hidden">
      <MediaGridFrame />
      <SkeletonScene
        className={`relative z-10 mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col pb-12`}
      >
        <div className="relative flex w-full flex-col items-start lg:flex-row lg:items-start">
          <MediaSidebarSkeleton />
          <main className="order-2 flex w-full min-w-0 flex-col self-start lg:flex-1 lg:border-l lg:border-white/10">
            <MediaHeroSkeleton />
            <CastSkeleton />
            {mediaType === 'tv' ? <TvSeasonsSkeleton /> : null}
            <FeatureSectionSkeleton titleWidth="w-16" />
            <FeatureSectionSkeleton
              titleWidth="w-16"
              controls={<SegmentedControlSkeleton itemWidths={['w-16', 'w-12', 'w-10']} />}
            />
            <FeatureSectionSkeleton
              titleWidth="w-14"
              video
              controls={<SegmentedControlSkeleton itemWidths={['w-16', 'w-12', 'w-16', 'w-10']} />}
            />
            <DiscoverySectionSkeleton titleWidth="w-24" />
            <DiscoverySectionSkeleton hasBottomBorder={false} titleWidth="w-28" />
          </main>
        </div>
        <ReviewsSkeleton />
      </SkeletonScene>
      <NavHeightSpacer />
    </PageGradientShell>
  );
}

export default function Loading() {
  return (
    <>
      <Registry isLoading={true} />
      <MediaDetailRouteSkeleton />
    </>
  );
}
