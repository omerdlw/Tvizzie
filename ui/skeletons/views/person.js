import { cn } from '@/core/utils';
import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/core/constants';
import NavHeightSpacer from '@/features/app-shell/nav-height-spacer';
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
    <div className="flex flex-col gap-0">
      <div className={cn("movie-detail-shell-inset movie-detail-shell-inset-compact flex flex-col gap-3 border-b border-white/10 py-5 lg:py-7")}>
        <div className="relative mx-auto aspect-2/3 w-full shrink-0 overflow-hidden rounded">
          <SkeletonBlock className="h-full w-full" radius="hero" />
          <SocialDockSkeleton />
        </div>
      </div>

      <div className={cn("movie-detail-shell-inset movie-detail-shell-inset-compact flex flex-col gap-5 py-6 lg:py-7")}>
        <div className="flex flex-col gap-1">
          {Array.from({ length: 5 }).map((_, index) => (
            <SidebarRowSkeleton key={index} />
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <Heading width="w-12" />
          <div className={`flex flex-col ${SKELETON_TOKENS.gap.compact}`}>
            <TextLine />
            <TextLine width="w-11/12" soft={true} />
            <TextLine width="w-4/5" soft={true} />
          </div>
        </div>
      </div>
    </div>
  );
}

function GalleryStripSkeleton() {
  return (
    <div className="flex w-full items-start gap-3 overflow-hidden">
      <SkeletonPoster className="w-48 sm:w-60" />
      <SkeletonPoster className="w-48 sm:w-60" />
      <SkeletonPoster className="w-48 sm:w-60" />
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

function PersonGridDivider() {
  return (
    <div className={cn("movie-detail-grid-divider")} aria-hidden="true" />
  );
}

function PersonGridSectionSkeleton({ children, divider = 'decorative' }) {
  const isPlainDivider = divider === 'plain';

  return (
    <div className={cn(`movie-detail-grid-subsection ${isPlainDivider ? cn('person-detail-plain-section') : ''}`)}>
      {isPlainDivider ? null : <PersonGridDivider />}
      <div
        className={
          isPlainDivider ? cn('movie-detail-shell-inset') : cn('movie-detail-grid-subsection-content movie-detail-shell-inset')
        }
      >
        {children}
      </div>
    </div>
  );
}

function PersonGallerySectionSkeleton() {
  return (
    <PersonGridSectionSkeleton divider="plain">
      <section className="flex w-full flex-col gap-3">
        <Heading width="w-20" />
        <GalleryStripSkeleton />
      </section>
    </PersonGridSectionSkeleton>
  );
}

function PersonFilmographySectionSkeleton({ divider = 'decorative' }) {
  return (
    <PersonGridSectionSkeleton divider={divider}>
      <section className="flex w-full flex-col gap-3">
        <Heading width="w-28" />
        <FilmographyGridSkeleton />
      </section>
    </PersonGridSectionSkeleton>
  );
}

function PersonMainSectionsSkeleton({ className = '' }) {
  return (
    <div className={`flex w-full flex-col gap-0 ${className}`}>
      <PersonGallerySectionSkeleton />
      <PersonFilmographySectionSkeleton />
    </div>
  );
}

function PersonDeferredMainSkeleton({ className = '' }) {
  return (
    <div className={`flex w-full flex-col gap-0 ${className}`}>
      <PersonGallerySectionSkeleton />
      <PersonFilmographySectionSkeleton />
    </div>
  );
}

function PersonAwardsContentSkeleton() {
  return (
    <PersonGridSectionSkeleton divider="plain">
      <section className="flex w-full flex-col gap-3">
        <div className="flex items-end justify-between gap-3">
          <Heading width="w-28" />
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
    </PersonGridSectionSkeleton>
  );
}

function PersonHeroSkeleton() {
  return (
    <>
      <div className="flex items-end justify-between gap-3">
        <SkeletonBlock className="h-16 w-1/2" radius="hero" />
      </div>

      <div className={cn("movie-detail-reading-measure mt-4 flex flex-col gap-2")}>
        <TextLine />
        <TextLine width="w-11/12" soft={true} />
        <TextLine width="w-5/6" soft={true} />
        <TextLine width="w-3/4" soft={true} />
      </div>
    </>
  );
}

function PersonContentSkeleton() {
  return (
    <PageGradientShell className="overflow-hidden" contentClassName={cn("movie-detail-grid-content")}>
      <div
        className={cn(`movie-detail-grid-frame relative mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col gap-0 px-0`)}
      >
        <div className={cn("person-detail-grid-primary")}>
          <div className="movie-detail-grid-sidebar w-full shrink-0">
            <div className="lg:sticky lg:top-0">
              <SidebarSkeleton />
            </div>
          </div>

          <div className={cn("movie-detail-grid-main flex w-full min-w-0 flex-col")}>
            <div className="flex w-full flex-col">
              <div className={cn("movie-detail-section-band movie-detail-shell-inset")}>
                <PersonHeroSkeleton />
              </div>
              <PersonMainSectionsSkeleton />
            </div>
            <NavHeightSpacer className="w-full" />
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
    <div className="flex items-end gap-3 rounded p-1">
      <SkeletonPoster className="aspect-2/3 w-16 shrink-0 sm:w-20" radius="field" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <TextLine width="w-2/5" />
        <TextLine width="w-4/5" soft={true} />
      </div>
    </div>
  );
}

export function PersonSectionSkeleton({ className = '' }) {
  return <PersonDeferredMainSkeleton className={className} />;
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
    <div className={`flex w-full flex-col gap-0 ${className}`}>
      <PersonAwardsContentSkeleton />
    </div>
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
