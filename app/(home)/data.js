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

export async function getHomeRouteData() {
  const [dailyTrendingResponse, weeklyTrendingResponse, discoverFirstResponse, genresResponse] = await Promise.all([
    getTrending('day', 'movie'),
    getTrending('week', 'movie'),
    discoverContent({ page: 1 }),
    getGenres(),
  ]);

  const firstDiscoverData = discoverFirstResponse.data || {};
  const initialDiscoverPage = firstDiscoverData.page || 1;
  const totalDiscoverPages = firstDiscoverData.total_pages || initialDiscoverPage;

  return {
    dailyTrendingItems: dailyTrendingResponse.data?.results || [],
    weeklyPopularMovies: weeklyTrendingResponse.data?.results || [],
    initialDiscoverItems: getUniqueItems(firstDiscoverData.results || []),
    initialDiscoverPage,
    initialHasMore: initialDiscoverPage < totalDiscoverPages,
    initialGenres: genresResponse.data || [],
  };
}
