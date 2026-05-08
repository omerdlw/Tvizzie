'use client';

import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/core/constants';
import { PageGradientShell } from '@/ui/elements/page-gradient-shell';
import { DiscoverSection } from '@/features/home/discover-section';
import { TrendingSection } from '@/features/home/trending-section';
import { HomeGridDivider, HomeGridFrame } from '@/features/home/grid-animation';

export default function View({ homeData = {} }) {
  const dailyItems = Array.isArray(homeData.dailyTrendingItems) ? homeData.dailyTrendingItems : [];
  const weeklyItems = Array.isArray(homeData.weeklyPopularMovies) ? homeData.weeklyPopularMovies : [];
  const initialDiscoverItems = Array.isArray(homeData.initialDiscoverItems) ? homeData.initialDiscoverItems : [];
  const initialGenres = Array.isArray(homeData.initialGenres) ? homeData.initialGenres : [];
  const initialDiscoverPage = Number(homeData.initialDiscoverPage) || 1;
  const initialHasMore = Boolean(homeData.initialHasMore);

  return (
    <PageGradientShell className="overflow-hidden" contentClassName="movie-detail-grid-content">
      <HomeGridFrame className={`mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col gap-0 px-0`}>
        <div className="p-8">
          <TrendingSection title="Trending Today" items={dailyItems} />
        </div>

        <div className="relative h-4 w-full">
          <HomeGridDivider />
        </div>

        <div className="p-8">
          <TrendingSection title="Popular This Week" items={weeklyItems} />
        </div>

        <div className="relative h-4 w-full">
          <HomeGridDivider />
        </div>

        <div className="p-8">
          <DiscoverSection
            initialDiscoverItems={initialDiscoverItems}
            initialGenres={initialGenres}
            initialDiscoverPage={initialDiscoverPage}
            initialHasMore={initialHasMore}
          />
        </div>
      </HomeGridFrame>
    </PageGradientShell>
  );
}
