import { ACCOUNT_ROUTE_SHELL_CLASS, ACCOUNT_SECTION_SHELL_CLASS } from '@/features/account/utils';
import { PageGradientShell } from '@/features/layout/page-gradient-backdrop';

const BLOCK = 'skeleton-block';
const BLOCK_SOFT = 'skeleton-block-soft';
const HERO_HEIGHT_CLASS = 'min-h-[500px] sm:min-h-[620px] lg:min-h-[600px]';

function Bar({ className = '', soft = false }) {
  return <div className={`${soft ? BLOCK_SOFT : BLOCK} ${className}`} />;
}

function Line({ className = '', soft = false }) {
  return <Bar className={`rounded-full ${className}`} soft={soft} />;
}

function Pill({ className = '', soft = false }) {
  return <Bar className={`rounded-[12px] ${className}`} soft={soft} />;
}

function Poster({ className = '', soft = false }) {
  return <Bar className={`aspect-2/3 w-full rounded-[14px] ${className}`} soft={soft} />;
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
      <Line className="h-8 w-12 rounded-[10px]" />
      <Line className="h-2.5 w-16" soft={true} />
    </div>
  );
}

function AccountHeroSkeleton() {
  return (
    <section className={`relative w-full bg-white ${HERO_HEIGHT_CLASS}`}>
      <div
        className={`${ACCOUNT_ROUTE_SHELL_CLASS} relative flex ${HERO_HEIGHT_CLASS} items-end px-4 pt-20 pb-5 sm:px-8 sm:pt-24 sm:pb-7 lg:pb-8`}
      >
        <div className="flex w-full flex-col gap-3">
          <div className="grid w-full gap-y-4 lg:grid-cols-[128px_minmax(0,1fr)_220px] lg:grid-rows-[auto_auto] lg:items-end lg:gap-x-8 lg:gap-y-0">
            <div className="h-28 w-28 justify-self-start overflow-hidden rounded-full sm:h-32 sm:w-32 lg:row-span-2 lg:self-end">
              <div className={`h-full w-full rounded-full ${BLOCK}`} />
            </div>

            <div className="lg:col-start-2 lg:row-span-2 lg:self-end">
              <div className="flex flex-col gap-4">
                <Line className="h-[3.6rem] w-[68%] rounded-[18px] sm:h-[4.2rem] lg:h-[4.8rem]" />

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
              <Line className="h-3.5 w-[76%]" soft={true} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AccountNavSkeleton() {
  const tabWidths = ['w-24', 'w-[5.5rem]', 'w-[4.5rem]', 'w-[5.5rem]', 'w-[5.5rem]', 'w-20', 'w-16'];

  return (
    <div>
      <div className={ACCOUNT_ROUTE_SHELL_CLASS}>
        <div className="flex w-full items-stretch gap-2 overflow-hidden px-4 py-3 sm:justify-center sm:px-8 sm:py-4">
          {tabWidths.map((width, index) => (
            <Pill key={index} className={`h-8 shrink-0 ${width}`} soft={index !== 0} />
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
          <div className={`${BLOCK_SOFT} size-6 rounded-[8px]`} />
          <Line className="h-3 w-24" />
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {summary ? <Line className="h-3 w-16" soft={true} /> : null}
          {seeMore ? <Line className="h-3 w-16" soft={true} /> : null}
        </div>
      </div>

      <div className={`h-px w-full ${BLOCK_SOFT}`} />
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

function PosterGridSkeleton({ count = 12 }) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
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

function PaginationSkeleton() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Line className="h-3 w-28" soft={true} />
      <div className="flex items-center justify-end gap-2">
        <Pill className="h-10 w-10" soft={true} />
        <Pill className="h-10 w-10" />
        <Pill className="h-10 w-10" soft={true} />
        <Pill className="h-10 w-10" soft={true} />
      </div>
    </div>
  );
}

function ListPreviewStackSkeleton() {
  const posterTransforms = [
    '-translate-x-[122px] rotate-[-8deg]',
    '-translate-x-[64px] rotate-[-4deg]',
    '-translate-x-1/2',
    'translate-x-[8px] rotate-[4deg]',
    'translate-x-[66px] rotate-[8deg]',
  ];

  return (
    <div className="relative h-[218px] overflow-hidden">
      <Bar className="absolute inset-x-0 top-8 h-[170px] rounded-[14px]" soft={true} />

      {posterTransforms.map((transformClass, index) => (
        <div key={transformClass} className={`absolute top-2 left-1/2 h-[164px] w-[104px] ${transformClass}`}>
          <Poster soft={index !== 2} />
        </div>
      ))}
    </div>
  );
}

function ListCardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <ListPreviewStackSkeleton />

      <div className={`rounded-[14px] ${BLOCK_SOFT}`}>
        <div className="flex items-start justify-between gap-4 px-4 py-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Line className="h-3.5 w-[74%]" />
            <Line className="h-2.5 w-24" soft={true} />
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <Pill className="size-8" soft={true} />
            <Pill className="size-8" soft={true} />
          </div>
        </div>

        <div className={`h-px w-full ${BLOCK}`} />

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

function ReviewCardSkeleton() {
  return (
    <div className={`rounded-[16px] p-4 ${BLOCK_SOFT}`}>
      <div className="flex gap-4">
        <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-[12px] sm:h-28 sm:w-[72px]">
          <Poster />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-2">
              <Line className="h-3 w-28" soft={true} />
              <Line className="h-4 w-48" />
            </div>

            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              <Pill className="size-8" soft={true} />
              <Pill className="size-8" soft={true} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Line className="h-4 w-24" />
            <Line className="h-3 w-20" soft={true} />
          </div>

          <div className="flex max-w-[72ch] flex-col gap-2">
            <Line className="h-3.5 w-full" soft={true} />
            <Line className="h-3.5 w-[94%]" soft={true} />
            <Line className="h-3.5 w-[76%]" soft={true} />
          </div>

          <div className="flex items-center gap-4">
            <Line className="h-3 w-16" soft={true} />
            <Line className="h-3 w-14" soft={true} />
            <Line className="h-3 w-14" soft={true} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ListDetailHeaderSkeleton() {
  return (
    <div className={`rounded-[18px] p-6 ${BLOCK_SOFT}`}>
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-5">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <Line className="h-8 w-56 rounded-[12px]" />
            <Line className="h-3 w-32" soft={true} />
          </div>

          <div className="hidden shrink-0 gap-2 sm:flex">
            <Pill className="h-10 w-[7.5rem]" soft={true} />
            <Pill className="h-10 w-[7.5rem]" soft={true} />
          </div>
        </div>

        <div className="flex max-w-[78ch] flex-col gap-2.5">
          <Line className="h-3 w-24" soft={true} />
          <Line className="h-3.5 w-full" soft={true} />
          <Line className="h-3.5 w-[93%]" soft={true} />
          <Line className="h-3.5 w-[86%]" soft={true} />
        </div>
      </div>
    </div>
  );
}

function FormFieldSkeleton({ tall = false }) {
  return (
    <div className="flex flex-col gap-2">
      <Line className="h-2.5 w-20" soft={true} />
      <Bar className={`w-full rounded-[12px] ${tall ? 'h-36' : 'h-11'} ${BLOCK_SOFT}`} />
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

      <Bar className={`overflow-hidden rounded-[12px] ${large ? 'h-28' : 'aspect-square'} ${BLOCK}`} />
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

function CollectionPageSkeleton({ extraChipCount = 2, itemCount = 12 }) {
  return (
    <div className="flex flex-col gap-8 py-8">
      <SectionShell className="flex flex-col gap-6">
        <ToolbarSkeleton firstWidth="sm:w-[9rem]" secondWidth="sm:w-[9rem]" extraChipCount={extraChipCount} />
        <PosterGridSkeleton count={itemCount} />
        <PaginationSkeleton />
      </SectionShell>
    </div>
  );
}

function CollectionSkeleton() {
  return <CollectionPageSkeleton extraChipCount={2} itemCount={12} />;
}

function ReviewsSkeleton() {
  return (
    <div className="flex flex-col gap-8 py-8">
      <SectionShell className="flex flex-col gap-6">
        <ToolbarSkeleton firstWidth="sm:w-[9rem]" secondWidth="sm:w-[10rem]" />
        <div className="flex flex-col gap-4">
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
  return <CollectionPageSkeleton extraChipCount={2} itemCount={12} />;
}

function ListsSkeleton() {
  return (
    <div className="flex flex-col gap-8 py-8">
      <SectionShell className="flex flex-col gap-6">
        <ToolbarSkeleton firstWidth="sm:w-[9rem]" secondWidth="sm:w-[10rem]" />
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
    <div className="flex flex-col gap-8 py-8">
      <SectionShell className="flex flex-col gap-6">
        <ListDetailHeaderSkeleton />
      </SectionShell>

      <CollectionPageSkeleton extraChipCount={3} itemCount={12} />
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
        <div className={`overflow-hidden rounded-[18px] ${BLOCK_SOFT}`}>
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
                  <div key={index} className={`flex items-center gap-3 rounded-[12px] p-2.5 ${BLOCK_SOFT}`}>
                    <Line className="h-3 w-4" soft={true} />
                    <Bar className={`h-16 w-11 shrink-0 rounded-[8px] ${BLOCK}`} />
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
