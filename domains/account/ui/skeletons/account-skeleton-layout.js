'use client';

import { ACCOUNT_ROUTE_SHELL_CLASS } from '@/shared/constants';
import NavHeightSpacer from '@/ui/layout/nav-height-spacer';
import { PageGradientShell } from '@/ui/layout/page-gradient-shell';
import AccountGridFrame from '../layouts/account-grid-frame';

const SECTION_ITEMS = [
  'Overview',
  'Activity',
  'Likes',
  'Watched',
  'Watchlist',
  'Reviews',
  'Lists',
];

export function AccountSectionNavSkeleton({ activeTab = 'overview' }) {
  return (
    <div className="bg-transparent">
      <div className={ACCOUNT_ROUTE_SHELL_CLASS}>
        <div className="flex w-full items-stretch gap-2 overflow-x-auto p-5 [scrollbar-width:none] sm:p-6 [&::-webkit-scrollbar]:hidden">
          {SECTION_ITEMS.map((label) => {
            const isSelected = label.toLowerCase() === activeTab.toLowerCase();
            return (
              <div
                key={label}
                className={`inline-flex h-8 min-w-[6.75rem] flex-auto items-center justify-center rounded-2xl px-3 backdrop-blur-md ${
                  isSelected ? 'bg-black/20' : 'bg-white/40'
                }`}
              >
                <div className="h-2.5 w-12 animate-pulse rounded-md bg-black/15" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function AccountHeroSkeleton() {
  return (
    <section className="relative flex w-full flex-col items-center gap-5 text-center sm:gap-7 lg:gap-8 py-2 sm:py-4">
      {/* Avatar & Title Row (Matches AccountHero 1-to-1) */}
      <div className="flex max-w-full items-center justify-center gap-3 sm:gap-4 lg:gap-5">
        <div className="relative h-12 w-12 shrink-0 animate-pulse rounded-2xl bg-black/10 sm:h-16 sm:w-16 lg:h-20 lg:w-20" />
        <div className="h-10 w-44 animate-pulse rounded-2xl bg-black/10 sm:h-14 sm:w-72 lg:h-16 lg:w-80" />
      </div>

      {/* Stats Row Under Title (Matches AccountHero 6 items 1-to-1) */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 px-2 text-sm sm:text-base">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-4 w-20 animate-pulse rounded-md bg-black/10 sm:w-24" />
        ))}
      </div>

      {/* Biography Lines (Matches AccountHero 1-to-1) */}
      <div className="mx-auto max-w-[72ch] w-full px-4 space-y-2">
        <div className="h-4 w-full max-w-[50ch] mx-auto animate-pulse rounded-md bg-black/10 sm:h-4.5" />
        <div className="h-4 w-2/3 max-w-[32ch] mx-auto animate-pulse rounded-md bg-black/10 sm:h-4.5" />
      </div>
    </section>
  );
}

export function AccountSkeletonLayout({ activeTab = 'overview', children }) {
  return (
    <PageGradientShell className="overflow-hidden">
      <AccountGridFrame />
      <div
        className={`relative z-10 mx-auto flex w-full ${ACCOUNT_ROUTE_SHELL_CLASS} flex-col gap-6 pb-12 sm:gap-8`}
      >
        <div className="absolute inset-x-0 top-0 z-20">
          <AccountSectionNavSkeleton activeTab={activeTab} />
        </div>

        <div className="mt-28 flex w-full flex-col items-center gap-8 sm:mt-36 sm:gap-12 lg:mt-44 lg:gap-16">
          <AccountHeroSkeleton />

          <main className="w-full text-left pt-4 pb-6 sm:pt-6 sm:pb-8">{children}</main>
        </div>
      </div>
      <NavHeightSpacer />
    </PageGradientShell>
  );
}
