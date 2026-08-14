'use client';

import { TMDB_IMG } from '@/shared/constants';
import NavHeightSpacer from '@/ui/layout/nav-height-spacer';
import Registry from '@/app/(home)/registry';
import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/shared/constants';
import { PageGradientShell } from '@/ui/layout/page-gradient-shell';
import { DiscoverSection } from '@/domains/home/ui/sections/discover-section';
import { TrendingSection } from '@/domains/home/ui/sections/trending-section';
import { TopRatedSection } from '@/domains/home/ui/sections/top-rated-section';
import { HomeMotionProvider } from '@/app/motion';
import HomeGridFrame from '@/domains/home/ui/layouts/home-grid-frame';

export default function Client({ data = {} }) {
  const activeHeroItem = Array.isArray(data.initialDiscoverItems)
    ? data.initialDiscoverItems[0]
    : null;
  const activeHeroBackground = activeHeroItem?.backdrop_path
    ? `${TMDB_IMG}/original${activeHeroItem.backdrop_path}`
    : null;

  return (
    <>
      <Registry backgroundImage={activeHeroBackground} />
      <View homeData={data} />
    </>
  );
}

function View({ homeData = {} }) {
  const dailyItems = Array.isArray(homeData.dailyTrendingItems) ? homeData.dailyTrendingItems : [];
  const weeklyItems = Array.isArray(homeData.weeklyPopularMovies)
    ? homeData.weeklyPopularMovies
    : [];
  const initialDiscoverItems = Array.isArray(homeData.initialDiscoverItems)
    ? homeData.initialDiscoverItems
    : [];
  const initialDiscoverPage = Number(homeData.initialDiscoverPage) || 1;
  const initialHasMore = Boolean(homeData.initialHasMore);
  const topRatedMovies = Array.isArray(homeData.topRatedMovies) ? homeData.topRatedMovies : [];
  const topRatedTvSeries = Array.isArray(homeData.topRatedTvSeries)
    ? homeData.topRatedTvSeries
    : [];

  return (
    <HomeMotionProvider>
      <PageGradientShell className="overflow-hidden">
        <HomeGridFrame />
        <div className="home-top-radial-gradient absolute inset-x-0 top-0 h-[34rem]" />
        <div
          className={`relative z-10 mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col gap-0 pt-20 pb-20`}
        >
          <DiscoverSection
            initialDiscoverItems={initialDiscoverItems}
            initialDiscoverPage={initialDiscoverPage}
            initialHasMore={initialHasMore}
          />

          <TrendingSection title="Trending today" items={dailyItems} />

          <TrendingSection title="Trending this week" items={weeklyItems} />

          <TopRatedSection
            fallbackMediaType="movie"
            items={topRatedMovies}
            title="IMDb Top 100 movies"
          />

          <TopRatedSection
            fallbackMediaType="tv"
            items={topRatedTvSeries}
            title="IMDb Top 100 TV series"
          />
        </div>
        <NavHeightSpacer className="w-full bg-black" />
      </PageGradientShell>
    </HomeMotionProvider>
  );
}
