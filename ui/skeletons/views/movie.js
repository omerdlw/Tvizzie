import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/core/constants';
import { PageGradientShell } from '@/ui/elements/page-gradient-shell';
import { SkeletonBlock, SkeletonCircle, SkeletonLine, SkeletonPill, SkeletonPoster } from '@/ui/skeletons/primitives';
import { FullscreenState } from '@/ui/states/fullscreen-state';

function Bar({ className = '', soft = false }) {
  return <SkeletonBlock className={className} soft={soft} />;
}

function Heading({ width = 'w-32' }) {
  return <SkeletonLine size="sm" className={width} />;
}

function TextLine({ width = 'w-full', soft = false, className = 'h-4' }) {
  const size = className === 'h-2.5' ? 'xs' : className === 'h-3' ? 'sm' : className === 'h-3.5' ? 'md' : 'lg';
  return <SkeletonLine size={size} className={width} soft={soft} />;
}

function SegmentTabs() {
  return (
    <div className="skeleton-block-soft inline-flex w-fit items-center gap-1 rounded-[12px] p-0.5">
      <SkeletonPill className="h-8 w-16" radius="segmentedItem" />
      <SkeletonPill className="h-8 w-20" radius="segmentedItem" soft={true} />
      <SkeletonPill className="h-8 w-16" radius="segmentedItem" soft={true} />
    </div>
  );
}

function SocialProofPills() {
  return (
    <div className="flex items-center gap-2">
      <SkeletonPill className="h-8 w-24" radius="full" soft={true} />
      <SkeletonPill className="h-8 w-20" radius="full" soft={true} />
    </div>
  );
}

function CastCard() {
  return (
    <div className="flex items-center gap-3 rounded-[14px] bg-black/5 p-1 pr-4 backdrop-blur-xs">
      <SkeletonPoster className="aspect-auto h-20 w-16 shrink-0 rounded-[9px]" radius="segmentedItem" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <TextLine width="w-2/3" className="h-3" />
        <TextLine width="w-1/2" className="h-2.5" soft={true} />
      </div>
    </div>
  );
}

function CompactCastCard() {
  return (
    <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-[12px] bg-black/5 p-1 pr-2 backdrop-blur-xs">
      <SkeletonBlock className="size-8 shrink-0 rounded-[9px]" />
      <TextLine width="w-3/5" className="h-3" />
    </div>
  );
}

function CarouselCard({ className = '', aspectClass = 'aspect-video', soft = false }) {
  return (
    <div className={`w-72 shrink-0 ${className}`}>
      <SkeletonBlock className={`${aspectClass} w-full rounded-[14px]`} soft={soft} />
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
      <SkeletonPill className="h-[42px]" soft={true} />
      <div className="grid grid-cols-1 gap-2 min-[460px]:grid-cols-2">
        <SkeletonPill className="h-[42px]" soft={true} />
        <SkeletonPill className="h-[42px]" soft={true} />
      </div>
      <SkeletonPill className="h-[42px]" soft={true} />
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
          <SkeletonPill className="h-7 w-20 rounded-[10px]" soft={true} />
          <SkeletonPill className="h-7 w-24 rounded-[10px]" soft={true} />
          <SkeletonPill className="h-7 w-16 rounded-[10px]" soft={true} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <TextLine width="w-10" className="h-2.5" soft={true} />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(9.5rem,100%),1fr))] gap-1.5">
          <SkeletonPill className="h-7 rounded-[10px]" soft={true} />
          <SkeletonPill className="h-7 rounded-[10px]" soft={true} />
        </div>
      </div>
    </div>
  );
}

function MovieHeroSkeleton() {
  return (
    <>
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
        <SkeletonBlock className="h-20 w-[52%]" radius="hero" />
        <SocialProofPills />
      </div>

      <div className="mt-4">
        <TextLine width="w-4/5" className="h-3" soft={true} />
      </div>

      <div className="mt-4 flex max-w-[70ch] flex-col gap-2">
        <TextLine soft={true} />
        <TextLine width="w-[95%]" soft={true} />
        <TextLine width="w-[88%]" soft={true} />
        <TextLine width="w-[74%]" soft={true} />
      </div>
    </>
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
          <SkeletonCircle className="size-[30px]" soft={true} />
          <TextLine width="w-36" className="h-4" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SkeletonPill className="h-9 w-28 rounded-[12px]" soft={true} />
          <SkeletonPill className="h-9 w-32 rounded-[12px]" soft={true} />
          <SkeletonPill className="h-9 w-24 rounded-[12px]" soft={true} />
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
            <div className="mt-3 flex max-w-[62ch] flex-col gap-2">
              <TextLine width="w-full" className="h-3.5" soft={true} />
              <TextLine width="w-[94%]" className="h-3.5" soft={true} />
              <TextLine width="w-[82%]" className="h-3.5" soft={true} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function MovieSectionSkeleton({ className = '', variant = 'gallery' }) {
  if (variant === 'images' || variant === 'videos') {
    return (
      <section className={`flex w-full flex-col gap-3 ${className || 'mt-10'}`}>
        <SegmentTabs />
        <LandscapeCarouselStrip />
      </section>
    );
  }

  if (variant === 'recommendations') {
    return (
      <section className={`flex w-full flex-col gap-3 ${className || 'mt-10'}`}>
        <Heading width="w-28" />
        <PosterCarouselStrip />
      </section>
    );
  }

  if (variant === 'reviews') {
    return <MovieReviewsSkeleton className={className || 'mt-12 md:mt-16'} />;
  }

  if (variant === 'cast') {
    return <MovieCastSkeleton className={className || 'mt-10'} />;
  }

  return (
    <section className={`flex w-full flex-col gap-3 ${className || 'mt-10'}`}>
      <Heading width="w-20" />
      <LandscapeCarouselStrip />
    </section>
  );
}

function MovieContentSkeleton() {
  return (
    <PageGradientShell>
      <div
        className={`relative mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col gap-6 px-3 pb-12 [overflow-anchor:none] sm:gap-8 sm:px-4 md:px-6`}
      >
        <div className="mt-6 flex w-full flex-col items-start gap-5 sm:mt-12 sm:gap-6 lg:mt-20 lg:flex-row lg:gap-12">
          <div className="w-full shrink-0 self-start lg:w-[400px]">
            <div className="flex w-full flex-col gap-3">
              <SkeletonBlock className="aspect-2/3 w-full" radius="hero" />
              <SidebarActionButtons />
              <SidebarTaxonomySkeleton />
              <div className="mt-2 flex flex-col gap-3">
                {Array.from({ length: 7 }).map((_, index) => (
                  <SidebarStat key={index} />
                ))}
              </div>
            </div>
          </div>

          <div className="flex w-full min-w-0 flex-col">
            <div className="flex w-full flex-col">
              <MovieHeroSkeleton />
              <MovieSectionSkeleton variant="cast" className="mt-10" />
              <MovieSectionSkeleton variant="gallery" className="mt-10" />
              <MovieSectionSkeleton variant="images" className="mt-10" />
              <MovieSectionSkeleton variant="videos" className="mt-10" />
              <MovieSectionSkeleton variant="recommendations" className="mt-10" />
              <MovieSectionSkeleton variant="recommendations" className="mt-10" />
            </div>
          </div>
        </div>

        <MovieSectionSkeleton variant="reviews" className="w-full" />
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
