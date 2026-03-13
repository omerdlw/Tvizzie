'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { motion } from 'framer-motion'

import ContentCard from '@/components/home/content-card'
import { DURATION } from '@/lib/constants'
import { TmdbService } from '@/services/tmdb.service'
import Icon from '@/ui/icon'

const STAGGER_CONTAINER = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: DURATION.RAPID,
      delayChildren: DURATION.VERY_FAST,
    },
  },
}

export default function HomeDiscover({
  initialType = 'movie',
  initialGenres = [],
  initialData = [],
}) {
  const [type, setType] = useState(initialType)
  const [genres, setGenres] = useState(initialGenres)
  const [activeGenre, setActiveGenre] = useState('all')

  const [items, setItems] = useState(initialData)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const isFirstRender = useRef(true)

  useEffect(() => {
    let isMounted = true
    async function fetchGenres() {
      const res = await TmdbService.getGenres(type)
      if (isMounted && res.data) {
        setGenres(res.data)
        setActiveGenre('all')
      }
    }
    if (type !== initialType || genres.length === 0) {
      fetchGenres()
    }
    return () => {
      isMounted = false
    }
  }, [type, initialType, genres.length])

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      if (type === initialType && activeGenre === 'all') {
        return
      }
    }

    let isMounted = true

    async function fetchContent() {
      setLoading(true)
      const res = await TmdbService.discoverContent({
        type,
        genreId: activeGenre,
        page: 1,
      })
      if (isMounted && res.data?.results) {
        setItems(res.data.results)
        setHasMore(res.data.page < res.data.total_pages)
        setPage(1)
      }
      if (isMounted) setLoading(false)
    }

    fetchContent()

    return () => {
      isMounted = false
    }
  }, [type, activeGenre, initialType])

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const nextPage = page + 1
    const res = await TmdbService.discoverContent({
      type,
      genreId: activeGenre,
      page: nextPage,
    })

    if (res.data?.results) {
      setItems((prev) => {
        const existingIds = new Set(prev.map((item) => item.id))
        const newItems = res.data.results.filter(
          (item) => !existingIds.has(item.id)
        )
        return [...prev, ...newItems]
      })
      setPage(nextPage)
      setHasMore(res.data.page < res.data.total_pages)
    }
    setLoadingMore(false)
  }, [type, activeGenre, page, loadingMore, hasMore])

  const displayCount = Math.floor(items.length / 12) * 12 || items.length
  const displayedItems = items.slice(0, displayCount)

  return (
    <div className="flex flex-col">
      <div className="z-10 flex flex-col gap-4 py-4 sm:py-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex w-fit items-center gap-1 rounded-full bg-white/5 p-1 ring-1 ring-white/10 backdrop-blur-sm">
            <button
              onClick={() => {
                if (type !== 'movie') {
                  setType('movie')
                  setActiveGenre('all')
                  setItems([])
                }
              }}
              className={`cursor-pointer rounded-full px-4 py-2 text-[10px] font-semibold tracking-widest uppercase transition-all duration-[var(--motion-duration-normal)] sm:text-xs ${
                type === 'movie'
                  ? 'bg-white text-black ring-1 ring-white/20'
                  : 'text-white/50 hover:bg-white/10 hover:text-white'
              }`}
            >
              Movies
            </button>
            <button
              onClick={() => {
                if (type !== 'tv') {
                  setType('tv')
                  setActiveGenre('all')
                  setItems([])
                }
              }}
              className={`cursor-pointer rounded-full px-4 py-2 text-[10px] font-semibold tracking-widest uppercase transition-all duration-[var(--motion-duration-normal)] sm:text-xs ${
                type === 'tv'
                  ? 'bg-white text-black ring-1 ring-white/20'
                  : 'text-white/50 hover:bg-white/10 hover:text-white'
              }`}
            >
              TV Shows
            </button>
          </div>
        </div>

        <div className="-m-1 flex items-center gap-2 overflow-x-auto p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => {
              setActiveGenre('all')
              setItems([])
            }}
            className={`shrink-0 cursor-pointer rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide transition-all duration-[var(--motion-duration-normal)] ${
              activeGenre === 'all'
                ? 'bg-white/20 text-white ring-1 ring-white/40'
                : 'bg-white/5 text-white/50 ring-1 ring-white/10 hover:bg-white/10 hover:text-white'
            }`}
          >
            All
          </button>
          {genres.map((genre) => (
            <button
              key={genre.id}
              onClick={() => {
                setActiveGenre(genre.id.toString())
                setItems([])
              }}
              className={`shrink-0 cursor-pointer rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide backdrop-blur-sm transition-all duration-[var(--motion-duration-normal)] ${
                activeGenre === genre.id.toString()
                  ? 'bg-white/20 text-white ring-1 ring-white/40'
                  : 'bg-white/5 text-white/50 ring-1 ring-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              {genre.name}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="flex h-[300px] w-full items-center justify-center">
          <Icon
            icon="solar:spinner-bold"
            size={32}
            className="animate-spin text-white/30"
          />
        </div>
      ) : displayedItems.length > 0 ? (
        <motion.div
          className="flex flex-wrap gap-x-3 gap-y-6 md:gap-x-[13.3333px] md:gap-y-4 lg:gap-x-3 lg:gap-y-6"
          variants={STAGGER_CONTAINER}
          initial="hidden"
          animate="visible"
        >
          {displayedItems.map((item) => (
            <ContentCard key={`${item.id}-${type}`} item={item} />
          ))}
        </motion.div>
      ) : (
        <div className="flex h-[300px] w-full flex-col items-center justify-center gap-4 text-white/40">
          <Icon icon="solar:ghost-bold" size={48} className="opacity-50" />
          <p className="text-sm font-semibold tracking-wide">
            No results found.
          </p>
        </div>
      )}

      {hasMore && !loading && items.length > 0 && (
        <div className="mt-6 flex justify-center pb-8">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="flex cursor-pointer items-center gap-2 rounded-full bg-white/5 px-6 py-3 text-xs font-semibold tracking-widest text-white uppercase ring-1 ring-white/10 backdrop-blur-sm transition-all duration-[var(--motion-duration-normal)] hover:bg-white/10 hover:ring-white/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingMore ? (
              <Icon
                icon="solar:spinner-bold"
                size={16}
                className="animate-spin"
              />
            ) : (
              <Icon icon="solar:refresh-bold" size={16} />
            )}
            {loadingMore ? 'Loading' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  )
}
