import { ACCOUNT_SECTION_SHELL_CLASS } from '@/core/constants';
import { cn } from '@/core/utils';
import { SkeletonBlock, SkeletonCircle, SkeletonLine, SkeletonPill, SkeletonPoster } from '@/ui/skeletons/primitives';

export function Bar({ className = '', soft = false }) {
  return <SkeletonBlock className={className} soft={soft} />;
}

export function Line({ className = '', soft = false }) {
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

export function Pill({ className = '', soft = false }) {
  return <SkeletonPill className={className} soft={soft} />;
}

export function Poster({ className = '', radius = 'card', soft = false }) {
  return <SkeletonPoster className={className} radius={radius} soft={soft} />;
}

export function SectionShell({ children, className = '' }) {
  return (
    <section className={cn('account-detail-grid-subsection bg-transparent')}>
      <div className={cn(`${ACCOUNT_SECTION_SHELL_CLASS} flex flex-col`, className)}>{children}</div>
    </section>
  );
}

export function SectionBodySkeleton({ children, className = '' }) {
  return <div className={cn('account-detail-section-body', className)}>{children}</div>;
}

export function SectionHeadingSkeleton({ summary = true, seeMore = true }) {
  return (
    <div className="account-detail-section-heading flex w-full flex-col gap-4">
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

export function PosterStripSkeleton({ count = 6 }) {
  const gridClassName = count > 5 ? 'lg:grid-cols-6' : 'lg:grid-cols-5';

  return (
    <div className={cn('grid grid-cols-2 gap-4 min-[30rem]:grid-cols-3', gridClassName)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex h-full min-w-0 flex-col">
          <Poster />
        </div>
      ))}
    </div>
  );
}

export function PosterGridSkeleton({ count = 12, compact = false }) {
  const gridClassName = compact
    ? 'grid grid-cols-3 gap-3 lg:grid-cols-6'
    : 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6';

  return (
    <div className={gridClassName}>
      {Array.from({ length: count }).map((_, index) => (
        <Poster key={index} />
      ))}
    </div>
  );
}

export function ToolbarSkeleton({ firstWidth = 'sm:w-44', secondWidth = 'sm:w-40', extraChipCount = 0, withSearch = false }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <Pill className={`h-11 w-full ${firstWidth}`} soft={true} />
      <Pill className={`h-11 w-full ${secondWidth}`} soft={true} />
      {Array.from({ length: extraChipCount }).map((_, index) => (
        <Pill key={index} className="h-11 w-full sm:w-36" soft={true} />
      ))}
      {withSearch ? <Pill className="h-11 w-full sm:min-w-72 sm:flex-1" soft={true} /> : null}
    </div>
  );
}

function FilterTriggerSkeleton({ index = 0 }) {
  const widthClassName =
    [
      'account-filter-skeleton-trigger-rating',
      'account-filter-skeleton-trigger-year',
      'account-filter-skeleton-trigger-sort',
      'account-filter-skeleton-trigger-visibility',
    ][index] || 'account-filter-skeleton-trigger-default';

  return (
    <div className={cn('account-filter-skeleton-trigger', widthClassName)} aria-hidden="true">
      <SkeletonBlock className="h-full w-full" soft={true} />
    </div>
  );
}

function FilterSearchSkeleton() {
  return (
    <div className="account-filter-skeleton-search" aria-hidden="true">
      <SkeletonBlock className="h-full w-full" soft={true} />
    </div>
  );
}

export function FilterBarSkeleton({ flush = false, triggerCount = 2, withSearch = false }) {
  return (
    <div
      className={cn(
        'account-filter-bar account-detail-full-width-item !-mt-8 flex flex-col !p-0',
        flush && 'account-filter-bar-flush'
      )}
    >
      <div className="account-filter-skeleton-main">
        <div className="account-filter-skeleton-inner">
          {withSearch ? <FilterSearchSkeleton /> : null}
          {Array.from({ length: triggerCount }).map((_, index) => (
            <FilterTriggerSkeleton key={index} index={index} />
          ))}
        </div>
      </div>
      <div className="account-filter-skeleton-rule" />
    </div>
  );
}

export function PaginationSkeleton() {
  return (
    <div className="grid w-full grid-cols-3 items-center gap-2 sm:gap-3">
      <div className="flex justify-start">
        <Pill className="h-10 min-w-24 sm:min-w-28" soft={true} />
      </div>
      <div className="flex items-center justify-center gap-3 sm:gap-4">
        <Line className="h-3.5 w-3" />
        <Line className="h-3.5 w-3" soft={true} />
        <Line className="h-3.5 w-3" soft={true} />
      </div>
      <div className="flex justify-end">
        <Pill className="h-10 min-w-24 sm:min-w-28" soft={true} />
      </div>
    </div>
  );
}

function ListPreviewStackSkeleton() {
  const posterTransforms = [
    '-translate-x-24 translate-y-2 -rotate-12 scale-75',
    '-translate-x-16 -translate-y-1 -rotate-6 scale-90',
    '-translate-x-1/2 -translate-y-3',
    '-translate-x-2 -translate-y-1 rotate-6 scale-90',
    'translate-x-8 translate-y-2 rotate-12 scale-75',
  ];

  return (
    <div className="relative h-48 bg-black">
      <Bar className="absolute inset-0" soft={true} />

      {posterTransforms.map((transformClass, index) => (
        <div key={transformClass} className={`absolute top-0 left-1/2 h-40 w-28 ${transformClass}`}>
          <Poster soft={index !== 2} />
        </div>
      ))}
    </div>
  );
}

export function ListCardSkeleton() {
  return (
    <div className="relative w-full">
      <ListPreviewStackSkeleton />

      <div className="absolute right-0 bottom-0 left-0 z-10 overflow-hidden bg-black/80">
        <div className="flex items-start justify-between gap-4 px-4 py-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Line className="h-4 w-3/4" />
            <Line className="h-4 w-1/2" soft={true} />
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <Pill className="size-8" soft={true} />
            <Pill className="size-8" soft={true} />
          </div>
        </div>

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

export function ActivityItemSkeleton({ isFirst = false }) {
  return (
    <article className={cn('account-detail-full-width-item border-b border-white/10', isFirst ? 'pt-0 pb-5' : 'py-5')}>
      <div className="grid gap-3 sm:grid-cols-2 sm:items-start">
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

export function ReviewCardSkeleton() {
  return (
    <article className={cn('account-detail-full-width-item border-b border-white/10 py-4 last:border-b-0 sm:py-5')}>
      <div className="relative">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <div className="relative h-24 w-16 shrink-0 overflow-hidden sm:h-28 sm:w-20">
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

            <div className="mt-1 flex max-w-2xl flex-col gap-2">
              <Line className="h-3.5 w-full" soft={true} />
              <Line className="h-3.5 w-3/4" soft={true} />
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

export function ListDetailHeaderSkeleton() {
  return (
    <div className="flex w-full flex-col gap-3">
      <Line className="h-8 w-56 sm:h-9 sm:w-72" />
      <div className="flex max-w-3xl flex-col gap-2">
        <Line className="h-3.5 w-full" soft={true} />
        <Line className="h-3.5 w-5/6" soft={true} />
      </div>
    </div>
  );
}

export function FormFieldSkeleton({ tall = false }) {
  return (
    <div className="flex flex-col gap-2">
      <Line className="h-2.5 w-20" soft={true} />
      <SkeletonPill className={`w-full ${tall ? 'h-36' : 'h-11'}`} radius="field" soft={true} />
    </div>
  );
}

export function MediaFieldSkeleton({ large = false }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
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
