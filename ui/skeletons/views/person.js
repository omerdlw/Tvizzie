import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/core/constants';
import { PageGradientShell } from '@/ui/elements/page-gradient-shell';
import {
  SkeletonBlock,
  SkeletonCircle,
  SkeletonLine,
  SkeletonPill,
  SkeletonPoster,
  SKELETON_TOKENS,
} from '@/ui/skeletons/primitives';
import { FullscreenState } from '@/ui/states/fullscreen-state';

function Heading({ width = 'w-24' }) {
  return <SkeletonLine size="sm" className={width} />;
}

function TextLine({ width = 'w-full', soft = false }) {
  return <SkeletonLine size="md" className={width} soft={soft} />;
}

function SidebarRowSkeleton() {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <SkeletonCircle className="mt-0.5 size-4 shrink-0" soft={true} />
      <TextLine width="w-44" soft={true} />
    </div>
  );
}

function SocialDockSkeleton() {
  return (
    <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2 px-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <SkeletonPill key={index} className="size-8" radius="field" soft={true} />
      ))}
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <div className={`flex flex-col ${SKELETON_TOKENS.gap.stack}`}>
      <div className="relative mx-auto aspect-2/3 w-full max-w-none shrink-0 overflow-hidden rounded-[20px] sm:max-w-[320px] lg:h-[600px] lg:w-[400px] lg:max-w-none">
        <SkeletonBlock className="h-full w-full" radius="hero" />
        <SocialDockSkeleton />
      </div>

      <div className="flex flex-col gap-1">
        {Array.from({ length: 5 }).map((_, index) => (
          <SidebarRowSkeleton key={index} />
        ))}
      </div>

      <div className="mt-1 flex flex-col gap-2">
        <Heading width="w-12" />
        <div className={`flex flex-col ${SKELETON_TOKENS.gap.compact}`}>
          <TextLine />
          <TextLine width="w-[92%]" soft={true} />
          <TextLine width="w-[80%]" soft={true} />
        </div>
      </div>
    </div>
  );
}

function GalleryStripSkeleton() {
  return (
    <div className="flex w-full items-start gap-3 overflow-hidden">
      <SkeletonPoster className="w-[min(14rem,calc(100vw-4.5rem))] sm:w-60" />
      <SkeletonPoster className="w-[min(14rem,calc(100vw-4.5rem))] sm:w-60" />
      <SkeletonPoster className="w-[min(14rem,calc(100vw-4.5rem))] sm:w-60" />
      <SkeletonPoster className="w-20" soft={true} />
    </div>
  );
}

function FilmographyGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <SkeletonPoster key={index} />
      ))}
    </div>
  );
}

function PersonMainSectionsSkeleton({ className = '' }) {
  return (
    <div className={`flex w-full flex-col gap-10 ${className}`}>
      <section className="flex w-full flex-col gap-3">
        <Heading width="w-20" />
        <GalleryStripSkeleton />
      </section>

      <section className="flex w-full flex-col gap-3">
        <Heading width="w-28" />
        <FilmographyGridSkeleton />
      </section>
    </div>
  );
}

function PersonHeroSkeleton() {
  return (
    <>
      <div className="flex items-end justify-between gap-3">
        <SkeletonBlock className="h-16 w-[56%]" radius="hero" />
      </div>

      <div className="mt-4">
        <SkeletonLine size="sm" className="w-44" />
      </div>

      <div className="mt-4 flex max-w-[72ch] flex-col gap-2">
        <TextLine />
        <TextLine width="w-[94%]" soft={true} />
        <TextLine width="w-[86%]" soft={true} />
        <TextLine width="w-[74%]" soft={true} />
      </div>
    </>
  );
}

function PersonContentSkeleton() {
  return (
    <PageGradientShell>
      <div
        className={`relative mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col gap-6 px-3 pb-12 [overflow-anchor:none] sm:gap-8 sm:px-4 md:px-6`}
      >
        <div className="mt-6 flex w-full flex-col items-start gap-5 sm:mt-12 sm:gap-6 lg:mt-20 lg:flex-row lg:gap-12">
          <div className="w-full shrink-0 self-start lg:w-[400px]">
            <SidebarSkeleton />
          </div>

          <div className="flex w-full min-w-0 flex-col">
            <div className="flex w-full flex-col">
              <PersonHeroSkeleton />
              <PersonMainSectionsSkeleton className="mt-10" />
            </div>
          </div>
        </div>
      </div>
    </PageGradientShell>
  );
}

function YearHeaderSkeleton() {
  return (
    <div className="mb-2 flex items-center gap-2 sm:gap-3">
      <SkeletonLine size="lg" className="w-9 shrink-0 sm:w-12" />
      <SkeletonBlock className="h-px flex-1" soft={true} />
    </div>
  );
}

function TimelineRowSkeleton() {
  return (
    <div className="flex items-end gap-3 rounded-[14px] p-1">
      <SkeletonPoster className="h-24 w-16 shrink-0 rounded-[10px] aspect-auto" radius="field" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <TextLine width="w-2/5" />
        <TextLine width="w-4/5" soft={true} />
      </div>
    </div>
  );
}

export function PersonSectionSkeleton({ className = '' }) {
  return <PersonMainSectionsSkeleton className={className || 'mt-10'} />;
}

export function PersonTimelineSkeleton({ className = '' }) {
  return (
    <section className={`flex w-full flex-col gap-3 ${className}`}>
      <Heading width="w-20" />
      {Array.from({ length: 3 }).map((_, groupIndex) => (
        <div key={groupIndex} className="mt-4 first:mt-0">
          <YearHeaderSkeleton />
          <div className="ml-0 flex flex-col gap-1 sm:ml-16">
            {Array.from({ length: 3 }).map((__, rowIndex) => (
              <TimelineRowSkeleton key={`${groupIndex}-${rowIndex}`} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

export function PersonAwardsSkeleton({ className = '' }) {
  return (
    <section className={`flex w-full flex-col gap-3 ${className}`}>
      <div className="flex items-end justify-between gap-3">
        <Heading width="w-20" />
        <TextLine width="w-36" soft={true} />
      </div>
      {Array.from({ length: 3 }).map((_, groupIndex) => (
        <div key={groupIndex} className="mt-4 first:mt-0">
          <YearHeaderSkeleton />
          <div className="ml-0 flex flex-col gap-1 sm:ml-16">
            {Array.from({ length: 3 }).map((__, rowIndex) => (
              <TimelineRowSkeleton key={`${groupIndex}-${rowIndex}`} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

export function Skeleton() {
  return (
    <FullscreenState
      affectGlobalState={false}
      className="h-screen w-screen"
      contentClassName="h-screen w-screen !block !p-0 overflow-y-auto"
    >
      <PersonContentSkeleton />
    </FullscreenState>
  );
}

export default Skeleton;
