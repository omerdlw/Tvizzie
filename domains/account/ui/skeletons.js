'use client';

import { usePathname } from 'next/navigation';

import { cn } from '@/ui/class-names';
import { PageGradientShell } from '@/ui/layouts/page-gradient-shell';
import { NavHeightSpacer } from '@/modules/nav';
import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/shared';

const S = 'skeleton-block';
const SOFT = 'skeleton-block-soft';

const SECTION_ITEMS = [
  'Overview',
  'Activity',
  'Diary',
  'Likes',
  'Watched',
  'Watchlist',
  'Reviews',
  'Lists',
];

const NAV_WIDTHS = ['w-20', 'w-16', 'w-14', 'w-20', 'w-24', 'w-24', 'w-20', 'w-16'];
const ACTIVITY_LINE_WIDTHS = ['w-2/5', 'w-3/5', 'w-1/2', 'w-2/3', 'w-5/12', 'w-7/12'];
const REVIEW_TITLE_WIDTHS = ['w-36', 'w-28', 'w-40', 'w-32'];

function SkeletonLine({ className = '', soft = false }) {
  return <div className={cn('h-3 rounded-full', soft ? SOFT : S, className)} />;
}

export function AccountSectionNavSkeleton({ activeTab = 'overview' }) {
  return (
    <nav
      aria-label="Loading account sections"
      aria-busy="true"
      className="flex w-full max-w-full items-center overflow-hidden"
    >
      {SECTION_ITEMS.map((label, index) => {
        const isSelected = label.toLowerCase() === activeTab.toLowerCase();

        return (
          <div
            key={label}
            className={cn(
              'flex h-12 shrink-0 items-center gap-1.5 border-b-2 border-transparent px-3 sm:px-4',
              isSelected && 'ring-white/70',
            )}
          >
            <div className={cn('size-3.5 rounded-[5px]', isSelected ? S : SOFT)} />
            <SkeletonLine className={NAV_WIDTHS[index]} soft={!isSelected} />
          </div>
        );
      })}
    </nav>
  );
}

export function AccountHeroSkeleton() {
  return (
    <>
      <div
        aria-hidden="true"
        className={cn(
          'relative h-64 w-full overflow-hidden sm:h-80 sm:w-[calc(100%+3rem)] sm:-translate-x-6 lg:h-[clamp(30rem,45vw,36rem)] lg:w-[calc(100%+16rem)] lg:-translate-x-32',
        )}
      />
      <section
        aria-busy="true"
        aria-label="Loading account profile"
        className="relative z-10 -mt-24 grid items-end gap-6 sm:-mt-36 sm:gap-8 lg:-mt-52 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-12"
      >
        <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-end gap-x-4 gap-y-2 sm:flex sm:items-end sm:gap-5">
          <div className={cn('size-20 shrink-0 rounded-[30px] sm:size-24', S)} />
          <div className="contents sm:flex sm:min-w-0 sm:flex-1 sm:flex-col sm:gap-2">
            <SkeletonLine className="h-12 w-3/5 max-w-md min-w-0 self-end rounded-[16px] sm:h-14 sm:self-auto" />
            <div className="col-span-2 flex w-full max-w-xl flex-col gap-2 sm:col-auto">
              <SkeletonLine className="w-full" soft />
              <SkeletonLine className="w-3/4" soft />
            </div>
          </div>
        </div>
        <div className="flex items-start lg:mb-1">
          {[0, 1].map((index) => (
            <div
              key={index}
              className={index === 0 ? 'pr-4 sm:pr-5' : 'border-l border-white/10 pl-4 sm:pl-5'}
            >
              <div className="flex min-w-16 flex-col gap-1">
                <SkeletonLine className="h-6 w-10" />
                <SkeletonLine className={index === 0 ? 'w-16' : 'w-20'} soft />
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export function AccountSkeletonLayout({ activeTab = 'overview', children }) {
  return (
    <PageGradientShell>
      <div
        className={`relative z-10 mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col px-4 pb-16 [overflow-anchor:none] sm:px-6 lg:px-8`}
      >
        <AccountHeroSkeleton />
        <div className="mt-8 border-b border-white/10 sm:mt-10">
          <AccountSectionNavSkeleton activeTab={activeTab} />
        </div>
        <main className="w-full pt-8 sm:pt-10">{children}</main>
      </div>
      <NavHeightSpacer className="w-full bg-black" />
    </PageGradientShell>
  );
}

export function resolveAccountTabFromPathname(pathname) {
  if (!pathname) return { activeTab: 'overview', variant: 'overview' };

  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] !== 'account') return { activeTab: 'overview', variant: 'overview' };
  if (segments[1] === 'edit') return { activeTab: 'overview', variant: 'edit' };
  if (segments.length <= 2) return { activeTab: 'overview', variant: 'overview' };

  const subtab = segments[2];
  if (subtab === 'activity') return { activeTab: 'activity', variant: 'activity' };
  if (subtab === 'diary') return { activeTab: 'diary', variant: 'diary' };
  if (subtab === 'likes') return { activeTab: 'likes', variant: 'likes' };
  if (subtab === 'watched') return { activeTab: 'watched', variant: 'watched' };
  if (subtab === 'watchlist') return { activeTab: 'watchlist', variant: 'watchlist' };
  if (subtab === 'reviews') return { activeTab: 'reviews', variant: 'reviews' };
  if (subtab === 'lists') return { activeTab: 'lists', variant: 'lists' };

  return { activeTab: 'overview', variant: 'overview' };
}

export function renderAccountSectionSkeleton(tabOrVariant) {
  switch (tabOrVariant) {
    case 'activity':
      return <AccountActivitySkeleton />;
    case 'diary':
      return <AccountDiarySkeleton />;
    case 'likes':
    case 'watched':
    case 'watchlist':
      return <AccountMediaGridSkeleton />;
    case 'reviews':
      return <AccountReviewsSkeleton />;
    case 'lists':
      return <AccountListsSkeleton />;
    case 'list-detail':
      return <AccountListDetailSkeleton />;
    case 'edit':
      return <AccountEditSkeleton />;
    case 'overview':
    default:
      return <AccountOverviewSkeleton />;
  }
}

export function AccountSkeleton({ activeTab: explicitActiveTab, children }) {
  const pathname = usePathname();
  const { activeTab: pathActiveTab, variant } = resolveAccountTabFromPathname(pathname);
  const activeTab = explicitActiveTab || pathActiveTab;
  const content = children || renderAccountSectionSkeleton(explicitActiveTab || variant);

  return <AccountSkeletonLayout activeTab={activeTab}>{content}</AccountSkeletonLayout>;
}

function SectionSkeleton({
  children,
  contentClassName = '',
  showHeader = true,
  summary = true,
  titleWidth = 'w-28',
  toolbar = null,
}) {
  return (
    <section className="relative w-full" aria-busy="true">
      {showHeader ? (
        <div className="mb-3 flex w-full items-center justify-between gap-4 sm:mb-4">
          <div className="flex min-w-0 items-center gap-2">
            <div className={cn('size-4 shrink-0 rounded-[5px]', S)} />
            <SkeletonLine className={titleWidth} />
          </div>
          {summary ? <SkeletonLine className="hidden w-20 sm:block" soft /> : null}
        </div>
      ) : null}
      {toolbar ? <div className="mb-4">{toolbar}</div> : null}
      <div className={cn('w-full', contentClassName)}>{children}</div>
    </section>
  );
}

export function SectionHeadingSkeleton({ titleWidth = 'w-28' }) {
  return (
    <div className="mb-3 flex w-full items-center justify-between gap-4 sm:mb-4" aria-hidden="true">
      <div className="flex items-center gap-2">
        <div className={cn('size-4 rounded-[5px]', S)} />
        <SkeletonLine className={titleWidth} />
      </div>
      <SkeletonLine className="hidden w-20 sm:block" soft />
    </div>
  );
}

export function PosterCardsSkeletonRow({ count = 6, wideGrid = true }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'grid w-full grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4',
        wideGrid ? 'md:grid-cols-6' : 'md:grid-cols-4 lg:grid-cols-6',
      )}
    >
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={cn('aspect-2/3 rounded-[20px]', S)} />
      ))}
    </div>
  );
}

export function MediaCardsSkeletonGrid({ count = 12 }) {
  return (
    <div
      aria-hidden="true"
      className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={cn('aspect-2/3 rounded-[20px]', S)} />
      ))}
    </div>
  );
}

export function ActivityItemsSkeletonList({ count = 6 }) {
  return (
    <div className="flex w-full flex-col gap-2" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex flex-col gap-3 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className={cn('size-4 shrink-0 rounded-full', SOFT)} />
              <SkeletonLine
                className={ACTIVITY_LINE_WIDTHS[index % ACTIVITY_LINE_WIDTHS.length]}
                soft
              />
            </div>
            <SkeletonLine className="w-9 shrink-0" soft />
          </div>
          {index % 3 === 0 ? <SkeletonLine className="w-full" soft /> : null}
        </div>
      ))}
    </div>
  );
}

function SingleListCardSkeleton() {
  return (
    <article className="relative h-[232px] w-full overflow-hidden" aria-hidden="true">
      <div className="relative h-[172px] overflow-hidden">
        {[0, 1, 2, 3, 4].map((index) => (
          <div
            key={index}
            className={cn(
              'absolute top-4 h-[132px] w-[84px] -translate-x-1/2',
              index === 0
                ? 'left-[24%] rotate-[-10deg]'
                : index === 1
                  ? 'left-[38%] rotate-[-5deg]'
                  : index === 2
                    ? 'left-1/2 z-10 -translate-x-1/2'
                    : index === 3
                      ? 'rotate-5deg left-[62%]'
                      : 'rotate-10deg left-[76%]',
              index === 2 ? S : SOFT,
            )}
          />
        ))}
      </div>
      <div className="absolute right-0 bottom-0 left-0 px-4 py-3">
        <SkeletonLine className="w-3/5" />
        <SkeletonLine className="mt-2 w-4/5" soft />
      </div>
    </article>
  );
}

export function ListCardsSkeletonGrid({ count = 6 }) {
  return (
    <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <SingleListCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function ReviewCardsSkeletonList({ count = 4 }) {
  return (
    <div className="flex w-full flex-col gap-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex gap-3 py-4 sm:gap-4">
          <div className={cn('h-24 w-16 shrink-0 rounded-[20px] sm:h-28 sm:w-[72px]', S)} />
          <div className="flex min-w-0 flex-1 flex-col gap-2.5 py-1">
            <div className="flex items-center justify-between gap-3">
              <SkeletonLine className={REVIEW_TITLE_WIDTHS[index % REVIEW_TITLE_WIDTHS.length]} />
              <SkeletonLine className="w-14 shrink-0" soft />
            </div>
            <SkeletonLine className="w-3/5" soft />
            <div className="flex flex-col gap-2 pt-1">
              <SkeletonLine className="w-full" soft />
              <SkeletonLine className="w-11/12" soft />
              {index % 2 === 0 ? <SkeletonLine className="w-2/3" soft /> : null}
            </div>
            <SkeletonLine className="mt-1 w-16" soft />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FilterBarSkeleton({ count = 4 }) {
  const widths = ['w-24', 'w-28', 'w-20', 'w-24', 'w-16'];

  return (
    <div className="flex w-full flex-wrap items-center gap-2" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex h-9 items-center gap-2 rounded-xl px-3">
          <div className={cn('size-3 rounded-full', SOFT)} />
          <SkeletonLine className={widths[index % widths.length]} soft />
        </div>
      ))}
    </div>
  );
}

export function AccountMediaGridSkeleton() {
  return (
    <div className="w-full pt-6 sm:pt-8">
      <SectionSkeleton showHeader={false} toolbar={<FilterBarSkeleton />}>
        <MediaCardsSkeletonGrid />
      </SectionSkeleton>
    </div>
  );
}

export function AccountActivitySkeleton() {
  return (
    <div className="w-full pt-6 sm:pt-8">
      <SectionSkeleton showHeader={false} toolbar={<FilterBarSkeleton />}>
        <ActivityItemsSkeletonList count={8} />
      </SectionSkeleton>
    </div>
  );
}

export function DiaryLedgerSkeleton() {
  return (
    <>
      <div className="hidden flex-col gap-3 sm:flex" aria-hidden="true">
        <div className="grid grid-cols-[1.2fr_.6fr_2fr_1fr_.7fr_.7fr] gap-4 px-4 py-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonLine key={index} className={index === 2 ? 'w-20' : 'w-12'} soft />
          ))}
        </div>
        {Array.from({ length: 7 }).map((_, row) => (
          <div
            key={row}
            className="grid grid-cols-[1.2fr_.6fr_2fr_1fr_.7fr_.7fr] items-center gap-4 px-4 py-3"
          >
            <SkeletonLine className={row === 0 || row === 4 ? 'w-20' : 'w-12'} />
            <SkeletonLine className="w-8" soft />
            <div className="flex items-center gap-3">
              <div className={cn('size-10 shrink-0 rounded-lg', S)} />
              <SkeletonLine className="w-32" />
            </div>
            <SkeletonLine className="w-16" soft />
            <div className={cn('mx-auto size-3 rounded-full', SOFT)} />
            <div className={cn('mx-auto size-3 rounded-full', SOFT)} />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:hidden" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center justify-between gap-3 rounded-2xl p-3.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <SkeletonLine className="w-6 shrink-0" soft />
              <div className={cn('size-10 shrink-0 rounded-lg', SOFT)} />
              <SkeletonLine className="w-24" />
            </div>
            <SkeletonLine className="w-12 shrink-0" soft />
          </div>
        ))}
      </div>
    </>
  );
}

export function AccountDiarySkeleton() {
  return (
    <div className="w-full pt-6 sm:pt-8">
      <SectionSkeleton titleWidth="w-16" summary={false}>
        <DiaryLedgerSkeleton />
      </SectionSkeleton>
    </div>
  );
}

export function AccountReviewsSkeleton() {
  return (
    <div className="w-full pt-6 sm:pt-8">
      <SectionSkeleton showHeader={false} toolbar={<FilterBarSkeleton />}>
        <ReviewCardsSkeletonList count={6} />
      </SectionSkeleton>
    </div>
  );
}

export function AccountListsSkeleton() {
  return (
    <div className="w-full pt-6 sm:pt-8">
      <SectionSkeleton showHeader={false} toolbar={<FilterBarSkeleton />}>
        <ListCardsSkeletonGrid count={6} />
      </SectionSkeleton>
    </div>
  );
}

export function AccountListDetailSkeleton() {
  return (
    <div className="flex w-full flex-col gap-10 pt-6 sm:gap-12 sm:pt-8">
      <SectionSkeleton titleWidth="w-40" toolbar={<FilterBarSkeleton count={3} />}>
        <MediaCardsSkeletonGrid />
      </SectionSkeleton>
      <SectionSkeleton titleWidth="w-24" toolbar={<FilterBarSkeleton count={2} />}>
        <ReviewCardsSkeletonList count={3} />
      </SectionSkeleton>
    </div>
  );
}

export function AccountOverviewSkeleton() {
  return (
    <div className="flex w-full flex-col gap-8 pt-6 sm:gap-10 sm:pt-8 md:gap-12">
      <SectionSkeleton summary={false} titleWidth="w-20">
        <PosterCardsSkeletonRow count={5} wideGrid={false} />
      </SectionSkeleton>
      <SectionSkeleton titleWidth="w-24">
        <PosterCardsSkeletonRow count={6} />
      </SectionSkeleton>
      <SectionSkeleton titleWidth="w-20">
        <PosterCardsSkeletonRow count={6} />
      </SectionSkeleton>
      <SectionSkeleton titleWidth="w-16">
        <PosterCardsSkeletonRow count={6} />
      </SectionSkeleton>
      <SectionSkeleton titleWidth="w-14">
        <ListCardsSkeletonGrid count={6} />
      </SectionSkeleton>
      <SectionSkeleton titleWidth="w-28">
        <ActivityItemsSkeletonList count={6} />
      </SectionSkeleton>
      <SectionSkeleton titleWidth="w-24">
        <ReviewCardsSkeletonList count={4} />
      </SectionSkeleton>
    </div>
  );
}

function AccountEditSectionSkeleton({ children, titleWidth = 'w-32' }) {
  return (
    <section className="w-full p-4 sm:p-6" aria-busy="true">
      <div className="mb-6 flex items-center justify-between gap-4 pb-4">
        <SkeletonLine className={titleWidth} />
        <SkeletonLine className="w-16" soft />
      </div>
      {children}
    </section>
  );
}

function AccountEditFieldSkeleton({ multiline = false, labelWidth = 'w-20' }) {
  return (
    <div className="flex w-full flex-col gap-2">
      <SkeletonLine className={labelWidth} soft />
      <div className={cn('w-full rounded-xl', multiline ? 'h-28' : 'h-11', S)} />
    </div>
  );
}

function AccountEditMediaFieldSkeleton({ banner = false }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_12rem]">
      <div className="flex flex-col gap-4">
        <AccountEditFieldSkeleton labelWidth="w-28" />
        <div className="flex flex-wrap gap-2">
          <div className={cn('h-9 w-28 rounded-xl', S)} />
          <div className={cn('h-9 w-16 rounded-xl', SOFT)} />
        </div>
      </div>
      <div className={cn('w-full rounded-[20px]', banner ? 'aspect-video' : 'aspect-square', S)} />
    </div>
  );
}

export function AccountEditSkeleton() {
  return (
    <div className="flex w-full flex-col gap-6 pt-6 sm:gap-8 sm:pt-8">
      <AccountEditSectionSkeleton titleWidth="w-32">
        <div className="grid gap-4 sm:grid-cols-2">
          <AccountEditFieldSkeleton labelWidth="w-20" />
          <AccountEditFieldSkeleton labelWidth="w-24" />
        </div>
        <div className="mt-4">
          <AccountEditFieldSkeleton multiline labelWidth="w-16" />
        </div>
      </AccountEditSectionSkeleton>

      <AccountEditSectionSkeleton titleWidth="w-28">
        <div className="flex flex-col gap-6">
          <AccountEditMediaFieldSkeleton />
          <AccountEditMediaFieldSkeleton banner />
        </div>
      </AccountEditSectionSkeleton>

      <AccountEditSectionSkeleton titleWidth="w-24">
        <div className="flex items-center justify-between gap-4 py-3 first:pt-0">
          <div className="flex flex-col gap-2">
            <SkeletonLine className="w-36" />
            <SkeletonLine className="w-56" soft />
          </div>
          <div className={cn('h-9 w-24 rounded-xl', S)} />
        </div>
      </AccountEditSectionSkeleton>
    </div>
  );
}

export default {
  AccountActivitySkeleton,
  AccountDiarySkeleton,
  AccountEditSkeleton,
  AccountHeroSkeleton,
  AccountListDetailSkeleton,
  AccountListsSkeleton,
  AccountMediaGridSkeleton,
  AccountOverviewSkeleton,
  AccountReviewsSkeleton,
  AccountSectionNavSkeleton,
  AccountSkeletonLayout,
  ActivityItemsSkeletonList,
  DiaryLedgerSkeleton,
  FilterBarSkeleton,
  ListCardsSkeletonGrid,
  MediaCardsSkeletonGrid,
  PosterCardsSkeletonRow,
  ReviewCardsSkeletonList,
  SectionHeadingSkeleton,
};
