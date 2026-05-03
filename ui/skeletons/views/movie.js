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
    <div className="skeleton-block-soft inline-flex w-fit items-center gap-1 rounded p-0.5">
      <SkeletonPill className="h-8 w-16" radius="segmentedItem" />
      <SkeletonPill className="h-8 w-20" radius="segmentedItem" soft={true} />
      <SkeletonPill className="h-8 w-16" radius="segmentedItem" soft={true} />
    </div>
  );
}

function CastCard() {
  return (
    <div className="flex items-center gap-3 rounded bg-white/10 p-1 pr-4 backdrop-blur-xs">
      <SkeletonPoster className="aspect-auto h-20 w-16 shrink-0" radius="segmentedItem" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <TextLine width="w-2/3" className="h-3" />
        <TextLine width="w-1/2" className="h-2.5" soft={true} />
      </div>
    </div>
  );
}

function CompactCastCard() {
  return (
    <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded bg-white/10 p-1 pr-2 backdrop-blur-xs">
      <SkeletonBlock className="size-8 shrink-0" radius="segmentedItem" />
      <TextLine width="w-3/5" className="h-3" />
    </div>
  );
}

function CarouselCard({ className = '', aspectClass = 'aspect-video', soft = false }) {
  return (
    <div className={`w-72 shrink-0 ${className}`}>
      <SkeletonBlock className={`${aspectClass} w-full`} soft={soft} />
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
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="movie-carousel-recommendation-item shrink-0">
          <SkeletonPoster soft={index > 3} />
        </div>
      ))}
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
          <SkeletonPill className="h-7 w-20" soft={true} />
          <SkeletonPill className="h-7 w-24" soft={true} />
          <SkeletonPill className="h-7 w-16" soft={true} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <TextLine width="w-10" className="h-2.5" soft={true} />
        <div className="grid grid-cols-2 gap-1.5">
          <SkeletonPill className="h-7" soft={true} />
          <SkeletonPill className="h-7" soft={true} />
        </div>
      </div>
    </div>
  );
}

function MovieHeroSkeleton() {
  return (
    <div className="movie-detail-shell-inset flex flex-col gap-4">
      <div className="flex flex-col items-start gap-1.5">
        <SkeletonBlock className="h-20 w-2/3 sm:h-24 lg:h-28" radius="hero" />
      </div>

      <div className="flex w-full flex-col gap-4">
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
    <section className={`relative isolate z-0 flex w-full flex-col gap-0 overflow-hidden rounded ${className}`}>
      <div className="media-reviews-header-plus p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <div className="flex min-w-0 items-center gap-3">
            <SkeletonCircle className="size-8" soft={true} />
            <TextLine width="w-36" className="h-4" />
          </div>
          <div className="movie-detail-meta-cluster flex flex-wrap items-center gap-2 lg:justify-end">
            <SkeletonPill className="h-10 min-w-28" soft={true} />
            <SkeletonPill className="h-10 min-w-28 sm:min-w-56" soft={true} />
            <SkeletonPill className="h-10 min-w-28" soft={true} />
          </div>
        </div>
      </div>

      <div className="grid-diamonds-top flex flex-col border-t border-white/10">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className={`relative p-5 ${index < 3 ? 'grid-diamonds-bottom border-b border-white/10' : ''}`}
          >
            <div className="flex min-w-0 items-start gap-3 sm:gap-4">
              <SkeletonBlock className="size-14 shrink-0" radius="field" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, starIndex) => (
                      <SkeletonBlock key={starIndex} className="size-3" radius="segmentedItem" />
                    ))}
                  </div>
                  <SkeletonCircle className="size-1" soft={true} />
                  <TextLine width="w-24" className="h-3" />
                  <SkeletonCircle className="size-1" soft={true} />
                  <TextLine width="w-20" className="h-3" soft={true} />
                </div>

                <div className="movie-detail-reading-measure flex flex-col gap-2">
                  <TextLine width={index % 2 === 0 ? 'w-full' : 'w-11/12'} className="h-3.5" soft={true} />
                  <TextLine width={index % 2 === 0 ? 'w-2/3' : 'w-4/5'} className="h-3.5" soft={true} />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <SkeletonCircle className="size-4" soft={true} />
                  <TextLine width="w-16" className="h-3" soft={true} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MovieGridDivider({ inset = false }) {
  return (
    <div className={`movie-detail-grid-divider${inset ? ' movie-detail-grid-divider-inset' : ''}`} aria-hidden="true" />
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
    <section className={`movie-detail-grid-subsection ${className}`}>
      <MovieGridDivider inset={true} />
      <div className="movie-detail-grid-subsection-content movie-detail-shell-inset">
        <MovieSectionContentSkeleton variant={variant} />
      </div>
    </section>
  );
}

function SidebarSkeleton() {
  return (
    <div className="flex h-full flex-col gap-0">
      <div className="movie-detail-shell-inset movie-detail-shell-inset-compact flex flex-col gap-2 py-7">
        <div className="relative mx-auto aspect-2/3 w-full shrink-0 overflow-hidden rounded">
          <SkeletonBlock className="h-full w-full" radius="hero" />
        </div>
        <SidebarActionButtons />
      </div>

      <div className="movie-detail-shell-inset movie-detail-shell-inset-compact flex flex-col justify-center gap-5 py-6 lg:flex-1 lg:py-7">
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

function MovieReviewsSidebarSkeleton() {
  return (
    <div className="flex h-full flex-col gap-0">
      <div className="movie-detail-shell-inset movie-detail-shell-inset-compact flex flex-col gap-2 py-7">
        <div className="relative mx-auto aspect-2/3 w-full shrink-0 overflow-hidden rounded">
          <SkeletonBlock className="h-full w-full" radius="hero" />
        </div>
      </div>

      <div className="movie-reviews-sidebar-actions">
        <SidebarActionButtons />
      </div>
    </div>
  );
}

function MovieReviewsHeroSkeleton() {
  return (
    <div className="movie-detail-shell-inset mb-6">
      <SkeletonBlock className="h-16 w-2/3 sm:h-20 lg:h-24" radius="hero" />
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
            <div className="h-full lg:sticky lg:top-0">
              <SidebarSkeleton />
            </div>
          </div>

          <div className="movie-detail-grid-main flex w-full min-w-0 flex-col">
            <div className="flex w-full flex-col">
              <div className="movie-detail-primary-stage flex flex-col py-7">
                <div className="movie-detail-primary-stage-shell flex flex-1 flex-col justify-between gap-8">
                  <MovieHeroSkeleton />
                  <div className="movie-detail-primary-cast-block">
                    <div className="movie-detail-shell-inset">
                      <MovieCastSkeleton />
                    </div>
                  </div>
                </div>
              </div>
              <MovieSectionSkeleton variant="gallery" />
              <MovieSectionSkeleton variant="images" />
            </div>
          </div>
        </div>

        <MovieSectionSkeleton variant="videos" />
        <MovieSectionSkeleton variant="recommendations" />
        <MovieSectionSkeleton variant="recommendations" />

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

export function MovieReviewsPageSkeleton() {
  return (
    <FullscreenState
      affectGlobalState={false}
      className="h-screen w-screen"
      contentClassName="h-screen w-screen !block !p-0 overflow-y-auto"
    >
      <PageGradientShell className="overflow-hidden" contentClassName="movie-detail-grid-content">
        <div
          className={`movie-detail-grid-frame overflow-anchor-none relative mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col gap-0 px-0`}
        >
          <section className="movie-detail-grid-section movie-detail-grid-primary movie-detail-grid-primary-layout movie-reviews-primary-layout items-stretch border-t-0">
            <div className="movie-detail-grid-sidebar w-full shrink-0">
              <div className="h-full lg:sticky lg:top-0">
                <MovieReviewsSidebarSkeleton />
              </div>
            </div>

            <div className="movie-detail-grid-main flex w-full min-w-0 flex-col">
              <div className="flex w-full flex-col py-7 sm:py-8 lg:py-12">
                <MovieReviewsHeroSkeleton />
                <MovieReviewsSkeleton className="movie-reviews-panel mt-1 md:mt-2" />
              </div>
            </div>
          </section>
        </div>
      </PageGradientShell>
    </FullscreenState>
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
