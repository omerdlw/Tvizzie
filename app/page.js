'use client'

import { useCallback, useEffect, useState } from 'react'

import ContentRow from '@/components/home/content-row'
import HomeDiscover from '@/components/home/discover'
import HeroSpotlight from '@/components/home/hero-spotlight'
import SearchAction from '@/components/nav-actions/search-action'
import { DURATION, EASING, TMDB_IMG } from '@/lib/constants'
import { useRegistry } from '@/lib/hooks/use-registry'
import { useBackgroundActions } from '@/modules/background/context'
import { useNavHeight } from '@/modules/nav/hooks'
import { ImdbService } from '@/services/imdb.service'
import { TmdbService } from '@/services/tmdb.service'

export default function Page() {
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const { navHeight } = useNavHeight()
  const { setBackground } = useBackgroundActions()

  useEffect(() => {
    async function fetchData() {
      const [trendRes, initialDiscoverRes, genresRes, topMoviesRes, topTvRes] =
        await Promise.all([
          TmdbService.getTrending('day'),
          TmdbService.discoverContent({ type: 'movie', page: 1 }),
          TmdbService.getGenres('movie'),
          ImdbService.getTop100('movies'),
          ImdbService.getTop100('tv'),
        ])

      setData({
        trending: trendRes.data?.results || [],
        initialDiscoverData: initialDiscoverRes.data?.results || [],
        initialGenres: genresRes.data || [],
        topMovies: topMoviesRes.data?.results || [],
        topTv: topTvRes.data?.results || [],
      })
      setLoading(false)
    }

    fetchData()
  }, [])

  const handleSlideChange = useCallback(
    (backdropPath) => {
      if (!backdropPath) return
      setBackground({
        image: `${TMDB_IMG}/original${backdropPath}`,
        overlay: true,
        overlayOpacity: 0.7,
        noiseStyle: {
          opacity: 0.5,
        },
        animation: {
          transition: { duration: DURATION.HERO, ease: EASING.STANDARD },
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
        },
      })
    },
    [setBackground]
  )

  useRegistry({
    nav: {
      action: <SearchAction />,
      isLoading: loading,
    },
    background: {},
    loading: { isLoading: loading },
  })

  if (loading) return null

  return (
    <div className="relative mx-auto mt-8 flex w-full max-w-6xl flex-col gap-6 p-3 select-none sm:mt-12 sm:p-4 md:gap-10 md:p-6 lg:mt-20">
      <HeroSpotlight items={data.trending} onSlideChange={handleSlideChange} />
      <HomeDiscover
        initialType="movie"
        initialGenres={data.initialGenres}
        initialData={data.initialDiscoverData}
      />
      {data.topMovies?.length > 0 && (
        <ContentRow
          title="Top 100 Movies All Time"
          items={data.topMovies}
          mediaType="movie"
        />
      )}
      {data.topTv?.length > 0 && (
        <ContentRow
          title="Top 100 Series All Time"
          items={data.topTv}
          mediaType="tv"
        />
      )}
      <div style={{ height: navHeight }} />
    </div>
  )
}
