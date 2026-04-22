'use client';

import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/core/constants';
import { PageGradientShell } from '@/ui/elements/page-gradient-shell';
import { DiscoverSection } from '@/features/home/discover-section';
import { TrendingSection } from '@/features/home/trending-section';

export default function View({ homeData = {} }) {
  const dailyItems = Array.isArray(homeData.dailyTrendingItems) ? homeData.dailyTrendingItems : [];
  const weeklyItems = Array.isArray(homeData.weeklyPopularMovies) ? homeData.weeklyPopularMovies : [];
  const initialDiscoverItems = Array.isArray(homeData.initialDiscoverItems) ? homeData.initialDiscoverItems : [];
  const initialGenres = Array.isArray(homeData.initialGenres) ? homeData.initialGenres : [];
  const initialDiscoverPage = Number(homeData.initialDiscoverPage) || 1;
  const initialHasMore = Boolean(homeData.initialHasMore);

  return (
    <PageGradientShell className="overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.2),transparent_55%)] opacity-50" />
      <div
        className={`relative mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col gap-10 px-3 pt-20 pb-20 sm:px-4 md:px-6`}
      >
        <DiscoverSection
          initialDiscoverItems={initialDiscoverItems}
          initialGenres={initialGenres}
          initialDiscoverPage={initialDiscoverPage}
          initialHasMore={initialHasMore}
        />

        <TrendingSection title="Today's popular movies" items={dailyItems} delay={0.12} distance={18} />

        <TrendingSection title="This week's popular movies" items={weeklyItems} delay={0.16} distance={18} />
      </div>
    </PageGradientShell>
  );
}
