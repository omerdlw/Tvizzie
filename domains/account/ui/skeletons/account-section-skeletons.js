'use client';

import { ACCOUNT_ROUTE_SHELL_CLASS, ACCOUNT_SECTION_SHELL_CLASS } from '@/shared/constants';

const S = 'skeleton-block animate-pulse';
const SOFT = 'skeleton-block-soft animate-pulse';

const HEADER_PADDING_CLASS = 'p-4';
const CONTENT_PADDING_CLASS = 'p-6';

/** The loading state uses the same full-width bands and rules as AccountSectionLayout. */
function SectionSkeleton({
  titleWidth = 'w-32',
  summary = true,
  showHeader = true,
  children,
  contentClassName = '',
  showTopRule = true,
  toolbar = null,
}) {
  return (
    <section className="relative bg-transparent">
      <div
        className={`${ACCOUNT_SECTION_SHELL_CLASS} ${showTopRule ? 'border-t border-black/10' : ''}`}
      >
        {showHeader ? (
          <>
            <div className={`flex w-full flex-col ${HEADER_PADDING_CLASS}`}>
              <div className="flex w-full items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-2">
                  <div className={`size-5 shrink-0 ${S}`} />
                  <div className={`h-3 ${titleWidth} ${S}`} />
                </div>
                {summary ? <div className={`h-3 w-16 shrink-0 ${SOFT}`} /> : null}
              </div>
            </div>
            <div className="h-px w-full bg-black/10" />
          </>
        ) : null}
        {toolbar ? (
          <div className={`${HEADER_PADDING_CLASS} border-b border-black/10`}>{toolbar}</div>
        ) : null}
        <div className={`${CONTENT_PADDING_CLASS} ${contentClassName}`}>{children}</div>
      </div>
    </section>
  );
}

export function SectionHeadingSkeleton({ titleWidth = 'w-32' }) {
  return (
    <div className="flex w-full flex-col">
      <div className={`${HEADER_PADDING_CLASS} flex w-full items-center justify-between gap-4`}>
        <div className="flex min-w-0 items-center gap-2">
          <div className={`size-5 shrink-0 ${S}`} />
          <div className={`h-3 ${titleWidth} ${S}`} />
        </div>
        <div className={`h-3 w-16 ${SOFT}`} />
      </div>
      <div className="h-px w-full bg-black/10" />
    </div>
  );
}

export function PosterCardsSkeletonRow({ count = 6, wideGrid = true }) {
  return (
    <div
      className={`grid w-full grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 ${wideGrid ? 'lg:grid-cols-6' : ''}`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`aspect-[2/3] w-full rounded-[20px] ${S}`}
          style={{ animationDelay: `${i * 45}ms` }}
        />
      ))}
    </div>
  );
}

export function MediaCardsSkeletonGrid({ count = 12 }) {
  return (
    <div className="grid grid-cols-2 gap-3 min-[420px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`aspect-[2/3] w-full rounded-[20px] ${S}`}
          style={{ animationDelay: `${i * 45}ms` }}
        />
      ))}
    </div>
  );
}

const ACTIVITY_LINE_WIDTHS = ['w-3/4', 'w-2/3', 'w-4/5', 'w-1/2', 'w-3/5', 'w-2/5'];

export function ActivityItemsSkeletonList({ count = 6 }) {
  return (
    <div className="w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-b border-black/10 py-5 first:pt-0 last:border-b-0 last:pb-0"
        >
          <div className="min-w-0 space-y-2 pt-0.5">
            <div className={`h-4 ${ACTIVITY_LINE_WIDTHS[i % ACTIVITY_LINE_WIDTHS.length]} ${S}`} />
            {i % 3 === 0 ? <div className={`h-3 w-2/5 ${SOFT}`} /> : null}
          </div>
          <div className={`mt-0.5 h-3.5 w-7 shrink-0 ${SOFT}`} />
        </div>
      ))}
    </div>
  );
}

function SingleListCardSkeleton({ delay = 0 }) {
  return (
    <article className="relative w-full" style={{ animationDelay: `${delay}ms` }}>
      <div className="relative h-[232px] w-full overflow-hidden bg-white/40">
        <div className="absolute inset-0 flex items-center justify-center">
          {[-76, -38, 0, 38, 76].map((offset, index) => (
            <div
              key={index}
              className={`absolute h-[156px] w-[98px] bg-black/[0.08] ${S}`}
              style={{
                transform: `translateX(${offset}px) rotate(${(index - 2) * 10}deg)`,
                zIndex: 5 - Math.abs(index - 2),
                animationDelay: `${delay + index * 45}ms`,
              }}
            />
          ))}
        </div>
      </div>
      <div className="absolute right-0 bottom-0 left-0 z-10 min-h-[124px] overflow-hidden bg-white p-4">
        <div className={`h-5 w-2/3 ${S}`} />
        <div className={`mt-2 h-3.5 w-full ${SOFT}`} />
        <div className={`mt-1.5 h-3.5 w-4/5 ${SOFT}`} />
        <div className="mt-3 flex h-11 items-center justify-between pt-3">
          <div className={`h-3 w-24 ${SOFT}`} />
          <div className={`h-3 w-20 ${SOFT}`} />
        </div>
      </div>
    </article>
  );
}

export function ListCardsSkeletonGrid({ count = 6 }) {
  return (
    <div className="grid w-full grid-cols-1 gap-x-6 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <SingleListCardSkeleton key={i} delay={i * 60} />
      ))}
    </div>
  );
}

const REVIEW_TITLE_WIDTHS = ['w-48', 'w-36', 'w-52', 'w-40'];

export function ReviewCardsSkeletonList({ count = 4 }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex gap-4 border-b border-black/10 py-3.5 first:pt-0 last:border-b-0 last:pb-0 sm:py-4 sm:first:pt-0 sm:last:pb-0"
        >
          <div className={`h-24 w-16 shrink-0 sm:h-28 sm:w-[72px] ${S}`} />
          <div className="flex min-w-0 flex-1 flex-col gap-2 pt-0.5">
            <div className="flex items-center justify-between gap-3">
              <div className={`h-4 ${REVIEW_TITLE_WIDTHS[i % REVIEW_TITLE_WIDTHS.length]} ${S}`} />
              <div className={`h-6 w-14 shrink-0 ${S}`} />
            </div>
            <div className={`h-3.5 w-full ${SOFT}`} />
            <div className={`h-3.5 w-3/4 ${SOFT}`} />
            <div className={`mt-1 h-3 w-20 ${SOFT}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AccountMediaGridSkeleton() {
  return (
    <SectionSkeleton showHeader={false} toolbar={<FilterBarSkeleton />}>
      <MediaCardsSkeletonGrid />
    </SectionSkeleton>
  );
}

export function AccountActivitySkeleton() {
  return (
    <SectionSkeleton showHeader={false} toolbar={<FilterBarSkeleton />}>
      <ActivityItemsSkeletonList count={8} />
    </SectionSkeleton>
  );
}

export function AccountReviewsSkeleton() {
  return (
    <SectionSkeleton showHeader={false} toolbar={<FilterBarSkeleton />}>
      <ReviewCardsSkeletonList count={6} />
    </SectionSkeleton>
  );
}

export function AccountListsSkeleton() {
  return (
    <SectionSkeleton showHeader={false} toolbar={<FilterBarSkeleton />}>
      <ListCardsSkeletonGrid count={6} />
    </SectionSkeleton>
  );
}

export function AccountListDetailSkeleton() {
  return (
    <div className="w-full">
      <div className={`${ACCOUNT_ROUTE_SHELL_CLASS} border-y border-black/10 p-4`}>
        <div className="flex w-full flex-col gap-3">
          <div className={`h-9 w-2/3 ${S}`} />
          <div className={`h-4 w-full max-w-2xl ${SOFT}`} />
        </div>
      </div>

      <SectionSkeleton showHeader={false} showTopRule={false} toolbar={<FilterBarSkeleton />}>
        <MediaCardsSkeletonGrid />
      </SectionSkeleton>

      <SectionSkeleton titleWidth="w-24" toolbar={<FilterBarSkeleton />}>
        <ReviewCardsSkeletonList count={3} />
      </SectionSkeleton>
    </div>
  );
}

export function AccountOverviewSkeleton() {
  return (
    <div className="w-full">
      <SectionSkeleton titleWidth="w-24">
        <PosterCardsSkeletonRow count={6} />
      </SectionSkeleton>
      <SectionSkeleton titleWidth="w-36">
        <ActivityItemsSkeletonList count={6} />
      </SectionSkeleton>
      <SectionSkeleton titleWidth="w-20">
        <ListCardsSkeletonGrid count={6} />
      </SectionSkeleton>
      <SectionSkeleton titleWidth="w-32">
        <ReviewCardsSkeletonList count={6} />
      </SectionSkeleton>
    </div>
  );
}

export function AccountEditSkeleton() {
  return (
    <SectionSkeleton titleWidth="w-28" summary={false} contentClassName="mx-auto w-full max-w-xl">
      <div className="space-y-4 bg-white/40">
        <div className="flex flex-col items-center gap-3">
          <div className={`size-28 ${S}`} />
          <div className={`h-3.5 w-28 ${SOFT}`} />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className={`h-3 w-24 ${SOFT}`} />
              <div className={`h-12 w-full bg-white/50 ${S}`} />
            </div>
          ))}
          <div className="space-y-2">
            <div className={`h-3 w-20 ${SOFT}`} />
            <div className={`h-24 w-full bg-white/50 ${S}`} />
          </div>
        </div>
        <div className="flex justify-end">
          <div className={`h-12 w-36 ${S}`} />
        </div>
      </div>
    </SectionSkeleton>
  );
}

export function FilterBarSkeleton() {
  return (
    <div className="flex w-full items-center gap-2">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className={`h-10 min-w-0 flex-auto bg-white/40 ${S}`} />
      ))}
    </div>
  );
}
