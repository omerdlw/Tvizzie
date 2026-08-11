'use client';

import { ACCOUNT_ROUTE_SHELL_CLASS } from '@/shared/constants';
import NavHeightSpacer from '@/ui/layout/nav-height-spacer';
import { PageGradientShell } from '@/ui/layout/page-gradient-shell';
import AccountGridFrame from '../layouts/account-grid-frame';

const SECTION_ITEMS = ['Overview', 'Activity', 'Likes', 'Watched', 'Watchlist', 'Reviews', 'Lists'];

export function AccountSectionNavSkeleton({ activeTab = 'overview' }) {
  return (
    <div className="relative w-full bg-transparent">
      <div className="pointer-events-none absolute bottom-0 left-1/2 w-screen -translate-x-1/2 border-b border-black/10" />
      <div className={ACCOUNT_ROUTE_SHELL_CLASS}>
        <div className="grid h-14 w-full auto-cols-[6.75rem] grid-flow-col divide-x divide-black/10 overflow-x-auto [scrollbar-width:none] sm:auto-cols-auto sm:grid-flow-row sm:grid-cols-7 [&::-webkit-scrollbar]:hidden">
          {SECTION_ITEMS.map((label) => {
            const isSelected = label.toLowerCase() === activeTab.toLowerCase();
            return (
              <div
                key={label}
                className={`inline-flex h-14 min-w-0 items-center justify-center px-3 backdrop-blur-md ${
                  isSelected ? 'bg-black' : 'bg-white/40'
                }`}
              >
                <div
                  className={`h-2.5 w-12 animate-pulse ${isSelected ? 'bg-white/70' : 'skeleton-block-soft'}`}
                />
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
    <section className="relative flex w-full flex-col items-center gap-5 py-2 text-center sm:gap-7 sm:py-4 lg:gap-8">
      {/* Avatar & Title Row (Matches AccountHero 1-to-1) */}
      <div className="flex max-w-full items-center justify-center gap-3 sm:gap-4 lg:gap-5">
        <div className="skeleton-block relative h-12 w-12 shrink-0 animate-pulse bg-white/40 sm:h-16 sm:w-16 lg:h-20 lg:w-20" />
        <div className="skeleton-block h-12 w-52 animate-pulse sm:h-16 sm:w-80 lg:h-20 lg:w-[28rem]" />
      </div>

      {/* Stats Row Under Title (Matches AccountHero 6 items 1-to-1) */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 px-2 text-sm sm:text-base">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="skeleton-block-soft h-4 w-20 animate-pulse sm:w-24" />
        ))}
      </div>

      {/* Biography Lines (Matches AccountHero 1-to-1) */}
      <div className="mx-auto w-full max-w-[72ch] space-y-2 px-4">
        <div className="skeleton-block-soft mx-auto h-4 w-full max-w-[50ch] animate-pulse sm:h-5" />
        <div className="skeleton-block-soft mx-auto h-4 w-2/3 max-w-[32ch] animate-pulse sm:h-5" />
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

          <main className="w-full pt-4 pb-6 text-left sm:pt-6 sm:pb-8">{children}</main>
        </div>
      </div>
      <NavHeightSpacer />
    </PageGradientShell>
  );
}
