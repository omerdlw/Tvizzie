import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/core/constants';
import { PageGradientShell } from '@/ui/elements/page-gradient-shell';
import { SkeletonBlock, SkeletonCircle, SkeletonLine, SkeletonPill, SkeletonPoster } from '@/ui/skeletons/primitives';
import { FullscreenState } from '@/ui/states/fullscreen-state';

function Heading({ width = 'w-32' }) {
  return <SkeletonLine size="sm" className={width} />;
}

function TextLine({ width = 'w-full', soft = false, className = 'h-4' }) {
  const size = className === 'h-2.5' ? 'xs' : className === 'h-3' ? 'sm' : className === 'h-3.5' ? 'md' : 'lg';
  return <SkeletonLine size={size} className={width} soft={soft} />;
}

function SegmentTabs() {
  return (
    <div className="skeleton-block-soft inline-flex w-fit items-center gap-1  p-0.5">
      <SkeletonPill className="h-8 w-16" radius="segmentedItem" />
      <SkeletonPill className="h-8 w-20" radius="segmentedItem" soft={true} />
      <SkeletonPill className="h-8 w-16" radius="segmentedItem" soft={true} />
    </div>
  );
}

function CastCard() {
  return (
    <div className="flex items-center gap-3  bg-black/5 p-1 pr-4 backdrop-blur-xs">
      <SkeletonPoster className="aspect-auto h-20 w-16 shrink-0 " radius="segmentedItem" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <TextLine width="w-2/3" className="h-3" />
        <TextLine width="w-1/2" className="h-2.5" soft={true} />
      </div>
    </div>
  );
}

function CompactCastCard() {
  return (
    <div className="flex h-10 min-w-0 flex-1 items-center gap-2  bg-black/5 p-1 pr-2 backdrop-blur-xs">
      <SkeletonBlock className="size-8 shrink-0 " />
      <TextLine width="w-3/5" className="h-3" />
    </div>
  );
}

function CarouselCard({ className = '', aspectClass = 'aspect-video', soft = false }) {
  return (
    <div className={`w-72 shrink-0 ${className}`}>
      <SkeletonBlock className={`${aspectClass} w-full `} soft={soft} />
    </div>
  );
}

function LandscapeCarouselStrip() {
  return (
    <div className="flex w-full items-start gap-3 overflow-hidden">
      <CarouselCard />
      <CarouselCard />
      <CarouselCard className="w-20" soft={true} />
    </div>
  );
}

function PosterCarouselStrip() {
  return (
    <div className="flex w-full items-start gap-3 overflow-hidden">
      <CarouselCard className="w-36" aspectClass="aspect-2/3" />
      <CarouselCard className="w-36" aspectClass="aspect-2/3" />
      <CarouselCard className="w-36" aspectClass="aspect-2/3" />
      <CarouselCard className="w-36" aspectClass="aspect-2/3" />
      <CarouselCard className="w-16" aspectClass="aspect-2/3" soft={true} />
    </div>
  );
}

function SidebarStat() {
  return (
    <div className="flex items-center gap-2">
      <SkeletonCircle className="size-3" soft={true} />
      <TextLine width="w-40" className="h-3" soft={true} />
    </div>
  );
}

function SidebarActionButtons() {
  return (
    <div className="flex flex-col gap-2">
      <SkeletonPill className="h-10" soft={true} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <SkeletonPill className="h-10" soft={true} />
        <SkeletonPill className="h-10" soft={true} />
      </div>
      <SkeletonPill className="h-10" soft={true} />
    </div>
  );
}

function SectionAction() {
  return <TextLine width="w-16" className="h-3" soft={true} />;
}

function SidebarTaxonomySkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <TextLine width="w-14" className="h-2.5" soft={true} />
        <div className="flex flex-wrap gap-1.5">
          <SkeletonPill className="h-7 w-20 " soft={true} />
          <SkeletonPill className="h-7 w-24 " soft={true} />
          <SkeletonPill className="h-7 w-16 " soft={true} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <TextLine width="w-10" className="h-2.5" soft={true} />
        <div className="grid grid-cols-2 gap-1.5">
          <SkeletonPill className="h-7 " soft={true} />
          <SkeletonPill className="h-7 " soft={true} />
        </div>
      </div>
    </div>
  );
}

function MovieHeroSkeleton() {
  return (
    <div className="movie-detail-shell-inset pb-8">
      <div className="flex flex-col items-start gap-1.5">
        <SkeletonBlock className="h-20 w-2/3 sm:h-24 lg:h-28" radius="hero" />
      </div>

      <div className="mt-4 flex w-full flex-col gap-4">
        <TextLine width="w-2/3" className="h-3" soft={true} />
        <div className="movie-detail-reading-measure flex flex-col gap-2">
          <TextLine soft={true} />
          <TextLine width="w-11/12" soft={true} />
          <TextLine width="w-5/6" soft={true} />
        </div>
      </div>
    </div>
  );
}

function MovieCastSkeleton({ className = '' }) {
  return (
    <section className={`flex w-full flex-col gap-3 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <SegmentTabs />
        <SectionAction />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <CastCard key={index} />
        ))}
      </div>

      <div className="flex h-10 items-center gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className={`min-w-0 flex-1 ${index > 1 ? 'hidden sm:block' : ''}`}>
            <CompactCastCard />
          </div>
        ))}
        <SkeletonPill className="size-10 shrink-0" radius="segmentedTrack" soft={true} />
      </div>
    </section>
  );
}

function MovieReviewsSkeleton({ className = '' }) {
  return (
    <section className={`relative flex w-full flex-col gap-6 overflow-hidden ${className}`}>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-2">
          <SkeletonCircle className="size-8" soft={true} />
          <TextLine width="w-36" className="h-4" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SkeletonPill className="h-9 w-28 " soft={true} />
          <SkeletonPill className="h-9 w-32 " soft={true} />
          <SkeletonPill className="h-9 w-24 " soft={true} />
        </div>
      </div>

      <div className="flex w-full flex-col items-start gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <TextLine width="w-40" className="h-4" />
          <TextLine width="w-60" className="mt-2 h-3" soft={true} />
        </div>
        <SkeletonPill className="h-10 w-full sm:w-32" radius="segmentedTrack" soft={true} />
      </div>

      <div className="flex flex-col gap-4">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="pb-4">
            <div className="flex items-center gap-3">
              <SkeletonCircle className="size-10" soft={true} />
              <div className="flex flex-col gap-2">
                <TextLine width="w-28" className="h-3" />
                <TextLine width="w-20" className="h-2.5" soft={true} />
              </div>
            </div>
            <div className="mt-3 flex max-w-2xl flex-col gap-2">
              <TextLine width="w-full" className="h-3.5" soft={true} />
              <TextLine width="w-11/12" className="h-3.5" soft={true} />
              <TextLine width="w-5/6" className="h-3.5" soft={true} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MovieGridDivider({ inset = false }) {
  return (
    <div className={`movie-detail-grid-divider${inset ? ' movie-detail-grid-divider-inset' : ''}`} aria-hidden="true">
      <span className="movie-detail-grid-divider-startcap">
        <span className="movie-detail-grid-divider-diamond movie-detail-grid-divider-diamond-start" />
      </span>
      <span className="movie-detail-grid-divider-endcap">
        <span className="movie-detail-grid-divider-diamond movie-detail-grid-divider-diamond-end" />
      </span>
    </div>
  );
}

function MovieSectionContentSkeleton({ variant = 'gallery' }) {
  if (variant === 'images' || variant === 'videos') {
    return (
      <section className="movie-detail-section-content w-full">
        <SegmentTabs />
        <LandscapeCarouselStrip />
      </section>
    );
  }

  if (variant === 'recommendations') {
    return (
      <section className="movie-detail-section-content w-full">
        <Heading width="w-28" />
        <PosterCarouselStrip />
      </section>
    );
  }

  if (variant === 'cast') {
    return <MovieCastSkeleton />;
  }

  return (
    <section className="movie-detail-section-content w-full">
      <Heading width="w-20" />
      <LandscapeCarouselStrip />
    </section>
  );
}

export function MovieSectionSkeleton({ className = '', variant = 'gallery' }) {
  if (variant === 'reviews') {
    return <MovieReviewsSkeleton className={className} />;
  }

  return (
    <section className={`movie-detail-grid-subsection px-4 sm:px-6 lg:px-8 ${className}`}>
      <MovieGridDivider inset={true} />
      <div className="movie-detail-grid-subsection-content">
        <MovieSectionContentSkeleton variant={variant} />
      </div>
    </section>
  );
}

function SidebarSkeleton() {
  return (
    <div className="flex flex-col gap-0">
      <div className="movie-detail-shell-inset movie-detail-shell-inset-compact flex flex-col gap-2 py-5 lg:py-7 grid-diamonds-bottom border-b border-black/10">
        <div className="relative mx-auto aspect-2/3 w-full shrink-0 overflow-hidden">
          <SkeletonBlock className="h-full w-full" radius="hero" />
        </div>
        <SidebarActionButtons />
      </div>

      <div className="movie-detail-shell-inset movie-detail-shell-inset-compact flex flex-col gap-5 py-6 lg:py-8">
        <SidebarTaxonomySkeleton />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 7 }).map((_, index) => (
            <SidebarStat key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MovieContentSkeleton() {
  return (
    <PageGradientShell className="overflow-hidden" contentClassName="movie-detail-grid-content">
      <div
        className={`movie-detail-grid-frame relative mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col gap-0 px-0`}
      >
        <div className="movie-detail-grid-section movie-detail-grid-primary movie-detail-grid-primary-layout items-stretch border-t-0">
          <div className="movie-detail-grid-sidebar w-full shrink-0">
            <div className="lg:sticky lg:top-0">
              <SidebarSkeleton />
            </div>
          </div>

          <div className="movie-detail-grid-main movie-detail-section-band flex w-full min-w-0 flex-col">
            <div className="flex w-full flex-col">
              <MovieHeroSkeleton />
              <MovieSectionSkeleton variant="cast" />
              <MovieSectionSkeleton variant="gallery" />
              <MovieSectionSkeleton variant="images" />
              <MovieSectionSkeleton variant="videos" />
              <MovieSectionSkeleton variant="recommendations" />
              <MovieSectionSkeleton variant="recommendations" />
            </div>
          </div>
        </div>

        <section className="movie-detail-grid-section movie-detail-grid-reviews w-full">
          <MovieGridDivider />
          <div className="movie-detail-grid-subsection-content">
            <MovieReviewsSkeleton />
          </div>
        </section>
      </div>
    </PageGradientShell>
  );
}

export function Skeleton() {
  return (
    <FullscreenState
      affectGlobalState={false}
      className="h-screen w-screen"
      contentClassName="h-screen w-screen !block !p-0 overflow-y-auto"
    >
      <MovieContentSkeleton />
    </FullscreenState>
  );
}

export default Skeleton;
