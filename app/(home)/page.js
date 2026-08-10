import Client from '@/app/(home)/client';
import { getUniqueDiscoverItems } from '@/domains/home/shared/discover';

import {
  discoverContent,
  getGenres,
  getTrending,
} from '@/infrastructure/tmdb/clients/tmdb-server-client';

export default async function Page() {
  const [dailyTrendingResponse, weeklyTrendingResponse, discoverFirstResponse, genresResponse] =
    await Promise.all([
      getTrending('day', 'movie'),
      getTrending('week', 'movie'),
      discoverContent({ page: 1 }),
      getGenres(),
    ]);

  const dailyTrendingItems = dailyTrendingResponse.data?.results || [];
  const weeklyPopularMovies = weeklyTrendingResponse.data?.results || [];
  const firstDiscoverData = discoverFirstResponse.data || {};
  const initialDiscoverItems = getUniqueDiscoverItems(firstDiscoverData.results || []);
  const initialDiscoverPage = firstDiscoverData.page || 1;
  const totalDiscoverPages = firstDiscoverData.total_pages || initialDiscoverPage;
  const initialHasMore = initialDiscoverPage < totalDiscoverPages;
  const initialGenres = genresResponse.data || [];

  return (
    <Client
      data={{
        dailyTrendingItems,
        weeklyPopularMovies,
        initialDiscoverItems,
        initialDiscoverPage,
        initialHasMore,
        initialGenres,
      }}
    />
  );
}

export const revalidate = 600;
