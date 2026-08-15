'use client';

import { GridShellCrosshairs } from '@/ui/layout/grid-crosshair';
import { ACCOUNT_ROUTE_SHELL_CLASS, ACCOUNT_SECTION_SHELL_CLASS } from '@/shared/constants';

const S = 'skeleton-block';
const SOFT = 'skeleton-block-soft';

const HEADER_PADDING_CLASS = 'min-h-14 px-4';
const CONTENT_PADDING_CLASS = 'p-6';
const TOOLBAR_PADDING_CLASS = 'min-h-14 px-4 flex items-center';

/** The loading state uses the same full-width bands and rules as AccountSectionLayout. */
function SectionSkeleton({
  titleWidth = 'w-32',
  summary = true,
  showHeader = true,
  children,
  contentClassName = '',
  isInitialSection = true,
  showTopRule = true,
  toolbar = null,
}) {
  return (
    <section className="relative bg-transparent">
      <div
        className={`${ACCOUNT_SECTION_SHELL_CLASS} relative`}
      >
        {showTopRule ? (
          <div className="pointer-events-none absolute top-0 left-1/2 h-px w-screen -translate-x-1/2 bg-white/10 backdrop-blur-sm">
          <GridShellCrosshairs />
        </div>
        ) : null}
        {showHeader ? (
          <div
            className={`relative flex w-full flex-col`}
          >
            <div
              className={`flex w-full items-center justify-between gap-4 ${HEADER_PADDING_CLASS}`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <div className={`size-5 shrink-0 ${S}`} />
                <div className={`h-3 ${titleWidth} ${S}`} />
              </div>
              {summary ? <div className={`h-3 w-16 shrink-0 ${SOFT}`} /> : null}
            </div>
            <div className="pointer-events-none absolute bottom-0 left-1/2 h-px w-screen -translate-x-1/2 bg-white/10 backdrop-blur-sm">
          <GridShellCrosshairs />
        </div>
          </div>
        ) : null}
        {toolbar ? (
          <div
            className={`relative ${TOOLBAR_PADDING_CLASS}`}
          >
            <div className="pointer-events-none absolute bottom-0 left-1/2 h-px w-screen -translate-x-1/2 bg-white/10 backdrop-blur-sm">
          <GridShellCrosshairs />
        </div>
            {toolbar}
          </div>
        ) : null}
        <div className={`${CONTENT_PADDING_CLASS} ${contentClassName}`}>{children}</div>
      </div>
    </section>
  );
}

export function SectionHeadingSkeleton({ titleWidth = 'w-32' }) {
  return (
    <div className="relative flex w-full flex-col">
      <div className={`${HEADER_PADDING_CLASS} flex w-full items-center justify-between gap-4`}>
        <div className="flex min-w-0 items-center gap-2">
          <div className={`size-5 shrink-0 ${S}`} />
          <div className={`h-3 ${titleWidth} ${S}`} />
        </div>
        <div className={`h-3 w-16 ${SOFT}`} />
      </div>
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-px w-screen -translate-x-1/2 bg-white/10 backdrop-blur-sm">
          <GridShellCrosshairs />
        </div>
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
          className={`aspect-[2/3] w-full ${S}`}
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
          className={`aspect-[2/3] w-full ${S}`}
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
          className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-b border-white/10 py-5 first:pt-0 last:border-b-0 last:pb-0"
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
  const previewPosters = [0, 1, 2, 3, 4].map((index) => {
    const distanceFromCenter = Math.abs(index - 2);
    const normalizedPosition = (index / 4) * 2 - 1;

    return {
      opacity: distanceFromCenter === 0 ? 1 : distanceFromCenter === 1 ? 0.64 : 0.36,
      scale: distanceFromCenter === 0 ? 1.05 : distanceFromCenter === 1 ? 0.95 : 0.88,
      x: -76 + index * 38,
      y: 6 + (-16 * (1 - distanceFromCenter / 2) || 0),
      zIndex: 10 - distanceFromCenter,
      rotate: normalizedPosition * 10,
    };
  });

  return (
    <article className="relative w-full" style={{ animationDelay: `${delay}ms` }}>
      <div className="relative h-[232px] w-full border border-white/10 bg-black/40">
        <div className="absolute inset-0">
          {previewPosters.map((poster, index) => (
            <div
              key={index}
              className="absolute top-0 left-1/2 h-[156px] w-[98px] overflow-hidden border border-white/10 bg-white/[0.08]"
              style={{
                opacity: poster.opacity,
                transform: `translateX(calc(-50% + ${poster.x}px)) translateY(${poster.y}px) rotate(${poster.rotate}deg) scale(${poster.scale})`,
                zIndex: poster.zIndex,
                animationDelay: `${delay + index * 45}ms`,
              }}
            />
          ))}
        </div>
      </div>
      <div className="absolute right-0 bottom-0 left-0 z-10 overflow-hidden border border-white/10 bg-black">
        <div className="px-4 py-4">
          <div className={`h-5 w-2/3 ${S}`} />
          <div className={`mt-2 h-3.5 w-full ${SOFT}`} />
          <div className={`mt-1.5 h-3.5 w-4/5 ${SOFT}`} />
        </div>
        <div className="flex h-11 items-center justify-between border-t border-white/10 px-3">
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
          className="flex gap-4 border-b border-white/10 py-3.5 first:pt-0 last:border-b-0 last:pb-0 sm:py-4 sm:first:pt-0 sm:last:pb-0"
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
      <SectionSkeleton showHeader={false} toolbar={<FilterBarSkeleton />}>
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
      <SectionSkeleton summary={false} titleWidth="w-24" isInitialSection>
        <PosterCardsSkeletonRow count={5} wideGrid={false} />
      </SectionSkeleton>
      <SectionSkeleton titleWidth="w-28" isInitialSection={false}>
        <PosterCardsSkeletonRow count={6} />
      </SectionSkeleton>
      <SectionSkeleton titleWidth="w-24" isInitialSection={false}>
        <PosterCardsSkeletonRow count={6} />
      </SectionSkeleton>
      <SectionSkeleton titleWidth="w-14" isInitialSection={false}>
        <PosterCardsSkeletonRow count={6} />
      </SectionSkeleton>
      <SectionSkeleton titleWidth="w-16" isInitialSection={false}>
        <ListCardsSkeletonGrid count={6} />
      </SectionSkeleton>
      <SectionSkeleton titleWidth="w-28" isInitialSection={false}>
        <ActivityItemsSkeletonList count={6} />
      </SectionSkeleton>
      <SectionSkeleton titleWidth="w-28" isInitialSection={false}>
        <ReviewCardsSkeletonList count={6} />
      </SectionSkeleton>
    </div>
  );
}

function AccountEditSectionSkeleton({ children, titleWidth = 'w-20' }) {
  return (
    <section className="relative bg-transparent">
      <div className={`${ACCOUNT_SECTION_SHELL_CLASS} relative flex flex-col`}>
        <div className="pointer-events-none absolute top-0 left-1/2 h-px w-screen -translate-x-1/2 bg-white/10 backdrop-blur-sm">
          <GridShellCrosshairs />
        </div>
        <div className="relative flex min-h-14 w-full items-center px-4">
          <div className={`h-3 ${titleWidth} ${S}`} />
          <div className="pointer-events-none absolute bottom-0 left-1/2 h-px w-screen -translate-x-1/2 bg-white/10 backdrop-blur-sm">
          <GridShellCrosshairs />
        </div>
        </div>
        <div className="flex flex-col gap-4 p-6">{children}</div>
      </div>
    </section>
  );
}

function AccountEditFieldSkeleton({ className = '', multiline = false, labelWidth = 'w-20' }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className={`h-2.5 ${labelWidth} ${SOFT}`} />
      <div
        className={`${multiline ? 'h-[150px]' : 'h-11'} w-full border border-white/5 bg-white/5 ${S}`}
      />
    </div>
  );
}

function AccountEditMediaFieldSkeleton({ previewClassName }) {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_172px] lg:items-start">
      <div className="space-y-3">
        <AccountEditFieldSkeleton labelWidth="w-16" />
        <div className="flex gap-2">
          <div className={`h-10 w-36 ${S}`} />
          <div className={`h-10 w-16 ${SOFT}`} />
        </div>
      </div>
      <div
        className={`${previewClassName} w-full overflow-hidden border border-white/10 bg-white/5 ${S}`}
      />
    </div>
  );
}

export function AccountEditSkeleton() {
  return (
    <div className="flex flex-col">
      <AccountEditSectionSkeleton titleWidth="w-14">
        <div className="grid gap-4 sm:grid-cols-2">
          <AccountEditFieldSkeleton labelWidth="w-20" />
          <AccountEditFieldSkeleton labelWidth="w-16" />
        </div>
        <AccountEditFieldSkeleton multiline labelWidth="w-10" />
      </AccountEditSectionSkeleton>

      <AccountEditSectionSkeleton titleWidth="w-28">
        <AccountEditMediaFieldSkeleton previewClassName="aspect-square" />
        <div className="h-px w-full bg-white/10" />
        <AccountEditMediaFieldSkeleton previewClassName="aspect-[16/7]" />
      </AccountEditSectionSkeleton>

      <AccountEditSectionSkeleton titleWidth="w-16">
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex flex-col gap-2">
            <div className={`h-2.5 w-20 ${SOFT}`} />
            <div className={`h-3 w-64 max-w-full ${SOFT}`} />
          </div>
          <div className={`h-6 w-11 shrink-0 ${S}`} />
        </div>
      </AccountEditSectionSkeleton>
    </div>
  );
}

export function FilterBarSkeleton({ count = 4 }) {
  const widths = ['w-28', 'w-24', 'w-36', 'w-20'];
  return (
    <div className="flex w-full items-center justify-between gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex flex-1 items-center justify-center gap-1.5">
          <div className={`h-2.5 ${widths[index % widths.length]} ${SOFT}`} style={{ animationDelay: `${index * 60}ms` }} />
          <div className={`h-2 w-2.5 shrink-0 ${SOFT}`} style={{ animationDelay: `${index * 60 + 30}ms` }} />
        </div>
      ))}
    </div>
  );
}
