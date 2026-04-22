import Client from './client';

import { discoverContent, getGenres, getTrending } from '@/core/clients/tmdb/server';

function getUniqueItems(items = []) {
  const seen = new Set();

  return items.filter((item) => {
    const id = item?.id;

    if (!id || seen.has(id)) {
      return false;
    }

    seen.add(id);
    return true;
  });
}

export default async function Page() {
  const [dailyTrendingResponse, weeklyTrendingResponse, discoverFirstResponse, genresResponse] = await Promise.all([
    getTrending('day', 'movie'),
    getTrending('week', 'movie'),
    discoverContent({ page: 1 }),
    getGenres(),
  ]);

  const dailyTrendingItems = dailyTrendingResponse.data?.results || [];
  const weeklyPopularMovies = weeklyTrendingResponse.data?.results || [];
  const firstDiscoverData = discoverFirstResponse.data || {};
  const initialDiscoverItems = getUniqueItems(firstDiscoverData.results || []);
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
