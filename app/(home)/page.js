import Client from './client'

import {
  discoverContent,
  getTrending,
  getGenres,
} from '@/lib/tmdb/server'

export default async function Page() {
  const [dailyTrendingResponse, weeklyTrendingResponse, discoverResponse, genresResponse] =
    await Promise.all([
      getTrending('day', 'movie'),
      getTrending('week', 'movie'),
      discoverContent({ page: 1 }),
      getGenres(),
    ])

  const heroItems = dailyTrendingResponse.data?.results || []
  const weeklyPopularMovies = weeklyTrendingResponse.data?.results || []
  const discoverData = discoverResponse.data || {}
  const initialDiscoverItems = discoverData.results || []
  const initialDiscoverPage = discoverData.page || 1
  const initialHasMore =
    initialDiscoverPage < (discoverData.total_pages || initialDiscoverPage)
  const initialGenres = genresResponse.data || []

  return (
    <Client
      homeData={{
        heroItems,
        discover: {
          initialGenres,
          initialHasMore,
          initialItems: initialDiscoverItems,
          initialPage: initialDiscoverPage,
        },
        popularRows: [
          {
            id: 'today-popular-movies',
            items: [...heroItems],
            title: "Today's Popular Movies",
          },
          {
            id: 'weekly-popular-movies',
            items: weeklyPopularMovies,
            title: "This Week's Popular Movies",
          },
        ].filter((row) => row.items.length > 0),
      }}
    />
  )
}
