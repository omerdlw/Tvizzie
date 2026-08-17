import Client from '@/app/(home)/client';
import {
  getImdbTop100,
} from '@/domains/home/server/imdb-top-100.server';
import {
  getUniqueDiscoverItems,
} from '@/domains/home/utils/discover';

import { discoverContent, getTrending } from '@/infrastructure/tmdb/clients/tmdb-server-client';

export default async function Page() {
  const [
    dailyTrendingResponse,
    weeklyTrendingResponse,
    discoverFirstResponse,
    topRatedMovies,
    topRatedTvSeries,
  ] = await Promise.all([
    getTrending('day', 'all'),
    getTrending('week', 'all'),
    discoverContent({ mediaType: 'movie', page: 1 }),
    getImdbTop100('movie'),
    getImdbTop100('tv'),
  ]);

  const dailyTrendingItems = dailyTrendingResponse.data?.results || [];
  const weeklyPopularMovies = weeklyTrendingResponse.data?.results || [];
  const firstDiscoverData = discoverFirstResponse.data || {};
  const initialDiscoverItems = getUniqueDiscoverItems(firstDiscoverData.results || []);
  const initialDiscoverPage = firstDiscoverData.page || 1;
  const totalDiscoverPages = firstDiscoverData.total_pages || initialDiscoverPage;
  const initialHasMore = initialDiscoverPage < totalDiscoverPages;

  return (
    <Client
      data={{
        dailyTrendingItems,
        weeklyPopularMovies,
        initialDiscoverItems,
        initialDiscoverPage,
        initialHasMore,
        topRatedMovies,
        topRatedTvSeries,
      }}
    />
  );
}

export const revalidate = 600;
