import { ACCOUNT_ROUTE_SHELL_CLASS, ACCOUNT_SECTION_SHELL_CLASS } from '@/core/constants';
import { PageGradientShell } from '@/ui/elements/page-gradient-shell';
import { SkeletonBlock, SkeletonCircle, SkeletonLine, SkeletonPill, SkeletonPoster } from '@/ui/skeletons/primitives';

const HERO_HEIGHT_CLASS = 'min-h-[460px] sm:min-h-[620px] lg:min-h-[600px]';
const HERO_BANNER_WRAPPER_CLASS =
  'mx-auto h-full w-full sm:w-[88%] lg:w-[70%] [mask-image:none] [-webkit-mask-image:none] sm:[mask-image:linear-gradient(90deg,transparent_0%,black_8%,black_92%,transparent_100%)] sm:[-webkit-mask-image:linear-gradient(90deg,transparent_0%,black_8%,black_92%,transparent_100%)]';
const HERO_AMBIENT_OVERLAY_CLASS =
  'account-skeleton-hero-ambient-overlay absolute inset-0';
const HERO_SOFTEN_OVERLAY_CLASS = 'account-hero-soften-overlay absolute inset-0';
const HERO_LEFT_FADE_CLASS =
  'account-hero-left-fade absolute inset-y-0 left-0 w-[16%] sm:w-[26%] lg:w-[34%]';
const HERO_RIGHT_FADE_CLASS =
  'account-hero-right-fade absolute inset-y-0 right-0 w-[16%] sm:w-[26%] lg:w-[34%]';
const HERO_TOP_FADE_CLASS =
  'account-hero-top-fade absolute inset-x-0 top-0 h-32 sm:h-36';
const HERO_TINT_CLASS = 'account-skeleton-hero-tint-overlay absolute inset-0';
const HERO_CENTER_GLOW_CLASS = 'absolute top-[16%] left-1/2 h-40 w-40 -translate-x-1/2 bg-white/60 blur-3xl sm:h-64 sm:w-64';
const ACCOUNT_SKELETON_ROUTE_VARIANTS = Object.freeze([
  { pattern: /\/lists\/[^/]+(?:\/)?$/, variant: 'list-detail' },
  { pattern: /\/activity(?:\/)?$/, variant: 'activity' },
  { pattern: /\/likes(?:\/)?$/, variant: 'collection' },
  { pattern: /\/lists(?:\/)?$/, variant: 'lists' },
  { pattern: /\/reviews(?:\/)?$/, variant: 'reviews' },
  { pattern: /\/watched(?:\/)?$/, variant: 'collection' },
  { pattern: /\/watchlist(?:\/)?$/, variant: 'collection' },
]);

export function resolveAccountSkeletonVariant(pathname = '') {
  const normalizedPathname = String(pathname || '').split('?')[0];
  return ACCOUNT_SKELETON_ROUTE_VARIANTS.find((item) => item.pattern.test(normalizedPathname))?.variant || 'overview';
}

function Bar({ className = '', soft = false }) {
  return <SkeletonBlock className={className} soft={soft} />;
}

function Line({ className = '', soft = false }) {
  const size = className.includes('h-2.5')
    ? 'xs'
    : className.includes('h-3.5')
      ? 'md'
      : className.includes('h-4')
        ? 'lg'
        : 'sm';
  return (
    <SkeletonLine
      className={className.replace(/h-\[[^\]]+\]|h-2\.5|h-3\.5|h-4|h-3/g, '').trim()}
      size={size}
      soft={soft}
    />
  );
}

function Pill({ className = '', soft = false }) {
  return <SkeletonPill className={className} soft={soft} />;
}

function Poster({ className = '', radius = 'card', soft = false }) {
  return <SkeletonPoster className={className} radius={radius} soft={soft} />;
}

function SectionShell({ children, className = '' }) {
  return <section className={`${ACCOUNT_SECTION_SHELL_CLASS} ${className}`}>{children}</section>;
}

function HeroCountItem({ mobile = false }) {
  return (
    <div
      className={
        mobile
          ? 'inline-flex min-w-0 items-baseline gap-1.5 text-left'
          : 'inline-flex items-baseline gap-1.5 whitespace-nowrap'
      }
    >
      <Line className={mobile ? 'h-4 w-10' : 'h-4 w-10'} />
      <Line className={mobile ? 'h-3 w-16' : 'h-3 w-14'} soft={true} />
    </div>
  );
}

function HeroEdgeMetric() {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <SkeletonLine size="xl" className="w-12" />
      <Line className="h-2.5 w-16" soft={true} />
    </div>
  );
}

function AccountHeroSkeleton() {
  return (
    <section className={`relative w-full overflow-hidden bg-white ${HERO_HEIGHT_CLASS}`}>
      <div className="absolute inset-0">
        <div className={`${HERO_BANNER_WRAPPER_CLASS} opacity-70`}>
          <SkeletonBlock className="h-full w-full rounded-none bg-black/[0.045]" soft={true} />
        </div>
      </div>
      <div className={HERO_TINT_CLASS} />
      <div className={HERO_SOFTEN_OVERLAY_CLASS} />
      <div className={HERO_AMBIENT_OVERLAY_CLASS} />
      <div className={HERO_LEFT_FADE_CLASS} />
      <div className={HERO_RIGHT_FADE_CLASS} />
      <div className={HERO_TOP_FADE_CLASS} />
      <div className={HERO_CENTER_GLOW_CLASS} />
      <div
        className={`${ACCOUNT_ROUTE_SHELL_CLASS} relative flex ${HERO_HEIGHT_CLASS} items-end px-4 pt-18 pb-5 sm:px-8 sm:pt-24 sm:pb-7 lg:pb-8`}
      >
        <div className="flex w-full flex-col gap-2 sm:gap-3">
          <div className="grid w-full gap-y-4 lg:grid-cols-[128px_minmax(0,1fr)_280px] lg:grid-rows-[auto_auto] lg:items-end lg:gap-x-8 lg:gap-y-0">
            <div className="h-24 w-24 justify-self-start overflow-hidden sm:h-32 sm:w-32 lg:row-span-2 lg:self-end">
              <SkeletonBlock className="h-full w-full" radius="hero" />
            </div>
            <div className="lg:col-start-2 lg:row-span-2 lg:self-end">
              <div className="flex flex-col gap-4">
                <SkeletonBlock className="h-[2.9rem] w-[68%] max-w-[34rem] rounded-[10px] sm:h-[3.6rem] lg:h-[4.8rem]" />
                <div className="grid grid-cols-3 gap-x-5 gap-y-4 pt-1 lg:hidden">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <HeroCountItem key={index} mobile={true} />
                  ))}
                </div>

                <div className="hidden items-center gap-x-7 gap-y-2 lg:flex">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <HeroCountItem key={index} />
                  ))}
                </div>
              </div>
            </div>

            <div className="hidden lg:col-start-3 lg:row-start-2 lg:block lg:self-end lg:justify-self-end">
              <div className="grid grid-cols-2 gap-6 text-center">
                <HeroEdgeMetric />
                <HeroEdgeMetric />
              </div>
            </div>
          </div>

          <div className="w-full lg:pl-[160px]">
            <div className="mt-2 flex max-w-[66ch] flex-col gap-2">
              <Line className="h-3.5 w-full" soft={true} />
              <Line className="h-3.5 w-[92%]" soft={true} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AccountNavSkeleton() {
  return (
    <div>
      <div className={ACCOUNT_ROUTE_SHELL_CLASS}>
        <div className="flex w-full items-stretch gap-2 overflow-x-auto px-3 py-2.5 sm:justify-center sm:px-8 sm:py-4">
          {Array.from({ length: 7 }).map((_, index) => (
            <Pill key={index} className="h-8 w-[6.75rem] shrink-0" soft={index !== 0} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionHeadingSkeleton({ summary = true, seeMore = true }) {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <SkeletonCircle className="size-6" soft={true} />
          <Line className="h-3 w-24" />
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {summary ? <Line className="h-3 w-16" soft={true} /> : null}
          {seeMore ? <Line className="h-3 w-16" soft={true} /> : null}
        </div>
      </div>

      <SkeletonBlock className="h-px w-full" soft={true} />
    </div>
  );
}

function PosterStripSkeleton({ count = 6 }) {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`flex h-full shrink-0 basis-[calc((100%-24px)/3)] flex-col lg:basis-[calc((100%-60px)/6)] ${
            index >= 3 ? 'hidden lg:block' : ''
          }`}
        >
          <Poster />
        </div>
      ))}
    </div>
  );
}

function PosterGridSkeleton({ count = 12, compact = false }) {
  const gridClassName = compact
    ? 'grid grid-cols-3 gap-3 lg:grid-cols-6'
    : 'grid grid-cols-2 gap-3 min-[420px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-6';

  return (
    <div className={gridClassName}>
      {Array.from({ length: count }).map((_, index) => (
        <Poster key={index} />
      ))}
    </div>
  );
}

function ToolbarSkeleton({ firstWidth = 'sm:w-44', secondWidth = 'sm:w-40', extraChipCount = 0, withSearch = false }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <Pill className={`h-11 w-full ${firstWidth}`} soft={true} />
      <Pill className={`h-11 w-full ${secondWidth}`} soft={true} />
      {Array.from({ length: extraChipCount }).map((_, index) => (
        <Pill key={index} className="h-11 w-full sm:w-[8.5rem]" soft={true} />
      ))}
      {withSearch ? <Pill className="h-11 w-full sm:min-w-[280px] sm:flex-1" soft={true} /> : null}
    </div>
  );
}

function FilterBarSkeleton({ count = 2 }) {
  return (
    <div className="flex w-full flex-nowrap items-center gap-2 overflow-hidden pb-5">
      {Array.from({ length: count }).map((_, index) => (
        <Pill key={index} className="h-9 min-w-[10rem] flex-1 rounded-[14px]" soft={true} />
      ))}
    </div>
  );
}

function PaginationSkeleton() {
  return (
    <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
      <div className="flex justify-start">
        <Pill className="h-10 min-w-24 rounded-[14px] sm:min-w-28" soft={true} />
      </div>
      <div className="flex items-center justify-center gap-3 sm:gap-4">
        <Line className="h-3.5 w-3" />
        <Line className="h-3.5 w-3" soft={true} />
        <Line className="h-3.5 w-3" soft={true} />
      </div>
      <div className="flex justify-end">
        <Pill className="h-10 min-w-24 rounded-[14px] sm:min-w-28" soft={true} />
      </div>
    </div>
  );
}

function ListPreviewStackSkeleton() {
  const posterTransforms = [
    '-translate-x-[132px] translate-y-[-8px] rotate-[-11deg] scale-[0.85]',
    '-translate-x-[92px] translate-y-[-14px] rotate-[-5deg] scale-[0.94]',
    'translate-x-[-50%] translate-y-[-20px] scale-[1.04]',
    '-translate-x-[12px] translate-y-[-14px] rotate-[5deg] scale-[0.94]',
    'translate-x-[28px] translate-y-[-8px] rotate-[11deg] scale-[0.85]',
  ];

  return (
    <div className="relative h-[186px] rounded-[14px] bg-white">
      <Bar className="absolute inset-0 rounded-[14px]" soft={true} />

      {posterTransforms.map((transformClass, index) => (
        <div key={transformClass} className={`absolute top-0 left-1/2 h-[164px] w-[104px] ${transformClass}`}>
          <Poster soft={index !== 2} />
        </div>
      ))}
    </div>
  );
}

function ListCardSkeleton() {
  return (
    <div className="relative w-full">
      <ListPreviewStackSkeleton />

      <div className="absolute right-0 bottom-0 left-0 z-10 overflow-hidden rounded-[14px] bg-white/80 backdrop-blur-md">
        <div className="flex items-start justify-between gap-4 px-4 py-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Line className="h-4 w-[74%]" />
            <Line className="h-4 w-[56%]" soft={true} />
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <Pill className="size-8" soft={true} />
            <Pill className="size-8" soft={true} />
          </div>
        </div>

        <SkeletonBlock className="h-px w-full" />

        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Line className="h-2.5 w-24" soft={true} />
          <div className="flex items-center gap-3">
            <Line className="h-2.5 w-10" soft={true} />
            <Line className="h-2.5 w-10" soft={true} />
            <Line className="h-2.5 w-10" soft={true} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityItemSkeleton({ isFirst = false }) {
  return (
    <article className={isFirst ? 'pt-0 pb-5' : 'py-5'}>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2">
          <Line className="h-4 w-16" />
          <Line className="h-4 w-28" soft={true} />
          <Line className="h-4 w-20" />
          <Line className="h-4 w-24" soft={true} />
        </div>
        <Line className="h-3.5 w-8 justify-self-start sm:justify-self-end" />
      </div>
    </article>
  );
}

function ReviewCardSkeleton() {
  return (
    <article className="py-4 sm:py-5">
      <div className="relative transition-all duration-[300ms]">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-[14px] sm:h-28 sm:w-[72px]">
            <Poster radius="card" />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1 self-stretch">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Line className="h-4 w-48 max-w-full" />
              </div>

              <div className="hidden shrink-0 items-center gap-2 sm:flex">
                <Pill className="size-8" soft={true} />
                <Pill className="size-8" soft={true} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <Line className="h-3.5 w-20" soft={true} />
              <Line className="h-3.5 w-16" soft={true} />
            </div>

            <div className="mt-1 flex max-w-[56ch] flex-col gap-2">
              <Line className="h-3.5 w-full" soft={true} />
              <Line className="h-3.5 w-[72%]" soft={true} />
            </div>

            <div className="mt-1">
              <Line className="h-3.5 w-16" soft={true} />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function ListDetailHeaderSkeleton() {
  return (
    <div className="flex w-full flex-col gap-3">
      <Line className="h-8 w-56 sm:h-9 sm:w-72" />
      <div className="flex max-w-[78ch] flex-col gap-2">
        <Line className="h-3.5 w-full" soft={true} />
        <Line className="h-3.5 w-[84%]" soft={true} />
      </div>
    </div>
  );
}

function FormFieldSkeleton({ tall = false }) {
  return (
    <div className="flex flex-col gap-2">
      <Line className="h-2.5 w-20" soft={true} />
      <SkeletonPill className={`w-full ${tall ? 'h-36' : 'h-11'}`} radius="field" soft={true} />
    </div>
  );
}

function MediaFieldSkeleton({ large = false }) {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_172px] lg:items-start">
      <div className="space-y-3">
        <FormFieldSkeleton />
        <div className="flex flex-wrap gap-2">
          <Pill className="h-10 w-40" soft={true} />
          <Pill className="h-10 w-20" soft={true} />
        </div>
      </div>

      <SkeletonBlock className={`overflow-hidden ${large ? 'h-28' : 'aspect-square'}`} radius="card" />
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-10 py-8">
      <SectionShell className="flex flex-col gap-6">
        <SectionHeadingSkeleton />
        <PosterStripSkeleton count={5} />
      </SectionShell>

      <SectionShell className="flex flex-col gap-6">
        <SectionHeadingSkeleton />
        <PosterStripSkeleton count={6} />
      </SectionShell>

      <SectionShell className="flex flex-col gap-6">
        <SectionHeadingSkeleton />
        <PosterStripSkeleton count={6} />
      </SectionShell>

      <SectionShell className="flex flex-col gap-6">
        <SectionHeadingSkeleton />
        <div className="grid grid-cols-1 gap-x-6 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <ListCardSkeleton key={index} />
          ))}
        </div>
      </SectionShell>

      <SectionShell className="flex flex-col gap-6">
        <SectionHeadingSkeleton />
        <PosterStripSkeleton count={6} />
      </SectionShell>

      <SectionShell className="flex flex-col gap-6">
        <SectionHeadingSkeleton />
        <div className="flex flex-col gap-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <ReviewCardSkeleton key={index} />
          ))}
        </div>
      </SectionShell>
    </div>
  );
}

function CollectionPageSkeleton({ filterCount = 5, itemCount = 12 }) {
  return (
    <div className="flex flex-col gap-8 py-8">
      <SectionShell className="flex flex-col gap-6">
        <FilterBarSkeleton count={filterCount} />
        <PosterGridSkeleton count={itemCount} />
        <PaginationSkeleton />
      </SectionShell>
    </div>
  );
}

function CollectionSkeleton() {
  return <CollectionPageSkeleton filterCount={5} itemCount={12} />;
}

function ReviewsSkeleton() {
  return (
    <div className="flex flex-col gap-8 py-8">
      <SectionShell className="flex flex-col gap-6">
        <FilterBarSkeleton count={5} />
        <div>
          {Array.from({ length: 4 }).map((_, index) => (
            <ReviewCardSkeleton key={index} />
          ))}
        </div>

        <div className="flex justify-center">
          <Pill className="h-11 w-36" soft={true} />
        </div>
      </SectionShell>
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="flex flex-col gap-8 py-8">
      <SectionShell className="flex flex-col gap-6">
        <FilterBarSkeleton count={2} />
        <div>
          {Array.from({ length: 5 }).map((_, index) => (
            <ActivityItemSkeleton key={index} isFirst={index === 0} />
          ))}
        </div>
      </SectionShell>
    </div>
  );
}

function ListsSkeleton() {
  return (
    <div className="flex flex-col gap-8 py-8">
      <SectionShell className="flex flex-col gap-6">
        <FilterBarSkeleton count={1} />
        <div className="grid w-full grid-cols-1 gap-x-6 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <ListCardSkeleton key={index} />
          ))}
        </div>
        <PaginationSkeleton />
      </SectionShell>
    </div>
  );
}

function ListDetailSkeleton() {
  return (
    <div className="flex flex-col">
      <SectionShell className="flex flex-col gap-6 pt-10 pb-8">
        <ListDetailHeaderSkeleton />
      </SectionShell>

      <SectionShell className="flex flex-col gap-5 pb-12">
        <FilterBarSkeleton count={5} />
        <PosterGridSkeleton count={12} compact={true} />
        <PaginationSkeleton />
      </SectionShell>

      <SectionShell className="flex flex-col gap-6 pt-4 pb-20">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-2">
            <SkeletonCircle className="size-8" soft={true} />
            <Line className="h-4 w-28" />
          </div>
          <Pill className="h-9 w-28 rounded-[12px]" soft={true} />
        </div>
        <div className="flex w-full flex-col items-start gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Line className="h-3.5 w-36" />
            <Line className="h-3 w-64 max-w-full" soft={true} />
          </div>
          <Pill className="h-10 w-full rounded-[12px] sm:w-36" soft={true} />
        </div>
        <ReviewCardSkeleton />
      </SectionShell>
    </div>
  );
}

function EditSkeleton() {
  return (
    <div className="flex flex-col gap-10 py-8">
      <SectionShell className="flex flex-col gap-6">
        <SectionHeadingSkeleton summary={false} seeMore={false} />
        <div className="flex gap-2">
          <Pill className="h-9 w-32" />
          <Pill className="h-9 w-28" soft={true} />
        </div>
      </SectionShell>

      <SectionShell className="flex flex-col gap-6">
        <SectionHeadingSkeleton summary={false} seeMore={false} />
        <div className="grid gap-4 md:grid-cols-2">
          <FormFieldSkeleton />
          <FormFieldSkeleton />
          <FormFieldSkeleton tall={true} />
          <FormFieldSkeleton />
        </div>
        <MediaFieldSkeleton />
        <MediaFieldSkeleton large={true} />
      </SectionShell>

      <SectionShell className="flex flex-col gap-6">
        <SectionHeadingSkeleton summary={false} seeMore={false} />
        <div className="grid gap-4 md:grid-cols-2">
          <FormFieldSkeleton />
          <FormFieldSkeleton />
        </div>
        <div className="flex gap-2">
          <Pill className="h-10 w-32" soft={true} />
          <Pill className="h-10 w-40" soft={true} />
        </div>
      </SectionShell>
    </div>
  );
}

function ListBuilderSkeleton() {
  return (
    <div className="py-8">
      <SectionShell>
        <div className="skeleton-block-soft overflow-hidden rounded-[14px]">
          <div className="grid min-h-[72vh] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_350px]">
            <section className="flex min-h-0 flex-col">
              <div className="p-4 sm:p-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                  <FormFieldSkeleton />
                  <FormFieldSkeleton />
                </div>

                <div className="mt-4">
                  <ToolbarSkeleton firstWidth="sm:w-[12rem]" secondWidth="sm:w-[8rem]" withSearch={true} />
                </div>
              </div>

              <div className="flex-1 p-4 sm:p-5">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <Poster key={index} />
                  ))}
                </div>
              </div>
            </section>

            <aside className="flex min-h-0 flex-col p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3 pb-4">
                <Line className="h-3 w-28" />
                <Pill className="h-8 w-14" soft={true} />
              </div>

              <div className="mt-4 flex flex-col gap-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="skeleton-block-soft flex items-center gap-3 rounded-[14px] p-2.5">
                    <Line className="h-3 w-4" soft={true} />
                    <SkeletonPoster className="aspect-auto h-16 w-11 shrink-0 rounded-[10px]" radius="field" />
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <Line className="h-3 w-4/5" />
                      <Line className="h-2.5 w-1/2" soft={true} />
                    </div>
                    <Pill className="size-8" soft={true} />
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </SectionShell>
    </div>
  );
}

function renderVariant(variant) {
  switch (variant) {
    case 'activity':
      return <ActivitySkeleton />;
    case 'collection':
      return <CollectionSkeleton />;
    case 'edit':
      return <EditSkeleton />;
    case 'list-builder':
      return <ListBuilderSkeleton />;
    case 'list-detail':
      return <ListDetailSkeleton />;
    case 'lists':
      return <ListsSkeleton />;
    case 'reviews':
      return <ReviewsSkeleton />;
    case 'overview':
    default:
      return <OverviewSkeleton />;
  }
}

export function Skeleton({ variant = 'overview' }) {
  return (
    <PageGradientShell className="overflow-hidden">
      <main className="relative min-h-screen overflow-hidden bg-white">
        <div className="relative z-10">
          <div className="relative">
            <AccountHeroSkeleton />
            <div className="absolute inset-x-0 top-0 z-20">
              <AccountNavSkeleton />
            </div>
          </div>
          {renderVariant(variant)}
        </div>
      </main>
    </PageGradientShell>
  );
}

export default Skeleton;
