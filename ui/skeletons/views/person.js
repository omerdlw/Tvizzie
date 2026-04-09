import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/core/constants';
import { FullscreenState } from '@/ui/states/fullscreen-state';

const BLOCK_SOFT = 'skeleton-block-soft';
const BLOCK = 'skeleton-block';

function Heading({ width = 'w-24' }) {
  return <div className={`h-3 ${width} rounded-full ${BLOCK}`} />;
}

function TextLine({ width = 'w-full', soft = false }) {
  return <div className={`h-3.5 ${width} rounded-full ${soft ? BLOCK_SOFT : BLOCK}`} />;
}

function SidebarRowSkeleton() {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className={`mt-0.5 size-4 shrink-0 rounded-[6px] ${BLOCK}`} />
      <TextLine width="w-44" soft={true} />
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-2/3 w-full max-w-none shrink-0 overflow-hidden rounded-[14px] lg:h-[600px] lg:w-[400px]">
        <div className={`h-full w-full ${BLOCK}`} />
        <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2 px-4">
          <div className={`size-8 rounded-full ${BLOCK_SOFT}`} />
          <div className={`size-8 rounded-full ${BLOCK_SOFT}`} />
          <div className={`size-8 rounded-full ${BLOCK_SOFT}`} />
          <div className={`size-8 rounded-full ${BLOCK_SOFT}`} />
        </div>
      </div>

      <div className="flex flex-col gap-0.5">
        {Array.from({ length: 5 }).map((_, index) => (
          <SidebarRowSkeleton key={index} />
        ))}
      </div>

      <div className="mt-1 flex flex-col gap-2">
        <Heading width="w-12" />
        <div className="flex flex-col gap-2">
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
      <div className={`aspect-2/3 w-56 shrink-0 rounded-[14px] ${BLOCK}`} />
      <div className={`aspect-2/3 w-56 shrink-0 rounded-[14px] ${BLOCK}`} />
      <div className={`aspect-2/3 w-56 shrink-0 rounded-[14px] ${BLOCK}`} />
      <div className={`aspect-2/3 w-20 shrink-0 rounded-[14px] ${BLOCK}`} />
    </div>
  );
}

function FilmographyGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className={`aspect-2/3 w-full rounded-[14px] ${BLOCK}`} />
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
        <div className={`h-16 w-[56%] rounded-[14px] ${BLOCK}`} />
      </div>

      <div className="mt-4">
        <TextLine width="w-44" />
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
  );
}

function YearHeaderSkeleton() {
  return (
    <div className="mb-2 flex items-center gap-2 sm:gap-3">
      <div className={`h-4 w-9 shrink-0 rounded-full sm:w-12 ${BLOCK}`} />
      <div className={`h-px flex-1 ${BLOCK}`} />
    </div>
  );
}

function TimelineRowSkeleton() {
  return (
    <div className="flex items-end gap-2.5 rounded-[12px] p-1.5 sm:gap-3">
      <div className={`h-24 w-16 shrink-0 rounded-[8px] ${BLOCK}`} />
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
    <FullscreenState className="h-screen w-screen" contentClassName="h-screen w-screen !block !p-0 overflow-y-auto">
      <PersonContentSkeleton />
    </FullscreenState>
  );
}

export default Skeleton;
