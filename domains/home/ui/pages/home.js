'use client';

import { PAGE_SHELL_MAX_WIDTH_CLASS, TMDB_IMG } from '@/shared';
import { NavHeightSpacer } from '@/modules/nav';
import HomeRegistry from '@/domains/home/ui/registry';
import { DiscoverSection } from '@/domains/home/ui/sections/discover-section';
import { HomeRailSection } from '@/domains/home/ui/sections/home-rail-section';

export default function HomeView({ data = {} }) {
  const activeHeroItem = Array.isArray(data.initialDiscoverItems)
    ? data.initialDiscoverItems[0]
    : null;
  const activeHeroBackground = activeHeroItem?.backdrop_path
    ? `${TMDB_IMG}/original${activeHeroItem.backdrop_path}`
    : null;

  return (
    <>
      <HomeRegistry backgroundImage={activeHeroBackground} />
      <HomeContent homeData={data} />
    </>
  );
}

function HomeContent({ homeData = {} }) {
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
    <>
      <div className="home-top-radial-gradient absolute inset-x-0 top-0 h-[34rem]" />
      <div
        className={`relative z-10 mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col gap-8 sm:gap-10 md:gap-12 px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-16`}
      >
        <DiscoverSection
          initialDiscoverItems={initialDiscoverItems}
          initialDiscoverPage={initialDiscoverPage}
          initialHasMore={initialHasMore}
        />

        <HomeRailSection title="Trending today" items={dailyItems} limit={12} />

        <HomeRailSection title="Trending this week" items={weeklyItems} limit={12} />

        <HomeRailSection
          fallbackMediaType="movie"
          items={topRatedMovies}
          limit={100}
          showRank
          title="IMDb Top 100 movies"
        />

        <HomeRailSection
          fallbackMediaType="tv"
          items={topRatedTvSeries}
          limit={100}
          showRank
          title="IMDb Top 100 TV series"
        />
      </div>
      <NavHeightSpacer className="w-full bg-black" />
    </>
  );
}
