'use client';

import { motion } from 'framer-motion';
import { PAGE_SHELL_MAX_WIDTH_CLASS } from '@/shared/constants';
import { PageGradientShell } from '@/ui/components/page-gradient-shell';
import { DiscoverSection } from '@/domains/home/discover-section';
import { TrendingSection } from '@/domains/home/trending-section';
import { homePageContainerVariants, homeBackgroundVariants } from '@/domains/home/animation-config';

export default function View({ homeData = {} }) {
  const dailyItems = Array.isArray(homeData.dailyTrendingItems) ? homeData.dailyTrendingItems : [];
  const weeklyItems = Array.isArray(homeData.weeklyPopularMovies)
    ? homeData.weeklyPopularMovies
    : [];
  const initialDiscoverItems = Array.isArray(homeData.initialDiscoverItems)
    ? homeData.initialDiscoverItems
    : [];
  const initialGenres = Array.isArray(homeData.initialGenres) ? homeData.initialGenres : [];
  const initialDiscoverPage = Number(homeData.initialDiscoverPage) || 1;
  const initialHasMore = Boolean(homeData.initialHasMore);

  return (
    <PageGradientShell className="overflow-hidden">
      <motion.div
        variants={homeBackgroundVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="home-top-radial-gradient absolute inset-x-0 top-0 h-[34rem]"
      />
      <motion.div
        variants={homePageContainerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={`relative mx-auto flex w-full ${PAGE_SHELL_MAX_WIDTH_CLASS} flex-col gap-10 px-3 pt-20 pb-20 sm:px-4 md:px-6`}
      >
        <DiscoverSection
          initialDiscoverItems={initialDiscoverItems}
          initialGenres={initialGenres}
          initialDiscoverPage={initialDiscoverPage}
          initialHasMore={initialHasMore}
        />

        <TrendingSection
          title="Today's popular movies"
          items={dailyItems}
        />

        <TrendingSection
          title="This week's popular movies"
          items={weeklyItems}
        />
      </motion.div>
    </PageGradientShell>
  );
}
