'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { motion } from 'framer-motion'

import MediaPosterCard from '@/features/shared/media-poster-card'
import { DURATION } from '@/core/constants'
import { cn } from '@/core/utils'
import { TmdbService } from '@/core/services/tmdb/tmdb.service'
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

const DEFAULT_DISCOVER_COLUMNS = 8
const DISCOVER_VISIBLE_ROWS = 2

function getDiscoverColumnCount(width) {
  if (width >= 1280) return 8
  if (width >= 1024) return 6
  if (width >= 768) return 4
  if (width >= 640) return 3
  return 2
}

function dedupeItems(items = []) {
  const seen = new Set()
  const uniqueItems = []

  for (const item of items) {
    const mediaType = item?.media_type || 'movie'
    const scopedId = `${mediaType}:${item?.id}`

    if (!item?.id || seen.has(scopedId)) {
      continue
    }

    seen.add(scopedId)
    uniqueItems.push({
      ...item,
      media_type: mediaType,
    })
  }

  return uniqueItems
}

function getPageInfo(data) {
  const page = Number(data?.page || 1)
  const totalPages = Number(data?.total_pages || page)

  return {
    hasMore: page < totalPages,
    page,
  }
}

function getGenreButtonClass(isActive) {
  return cn(
    'shrink-0 border px-4 py-1.5 text-xs font-semibold tracking-wide text-white transition-colors duration-300',
    isActive
      ? 'border-white/10 /70'
      : 'border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10'
  )
}

export default function HomeDiscover({
  initialGenres = [],
  initialData = [],
  initialPage = 1,
  initialHasMore = false,
}) {
  const [columnCount, setColumnCount] = useState(() =>
    typeof window === 'undefined'
      ? DEFAULT_DISCOVER_COLUMNS
      : getDiscoverColumnCount(window.innerWidth)
  )
  const [genres, setGenres] = useState(initialGenres)
  const [activeGenre, setActiveGenre] = useState('all')
  const [items, setItems] = useState(() => dedupeItems(initialData))
  const [page, setPage] = useState(initialPage)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [status, setStatus] = useState('idle')
  const [loadMoreStatus, setLoadMoreStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [visibleCount, setVisibleCount] = useState(() =>
    DEFAULT_DISCOVER_COLUMNS * DISCOVER_VISIBLE_ROWS
  )

  const activeGenreRef = useRef(activeGenre)
  const requestIdRef = useRef(0)
  const skipInitialAllFetchRef = useRef(true)
  const visibleBatchSize = columnCount * DISCOVER_VISIBLE_ROWS
  const visibleBatchSizeRef = useRef(visibleBatchSize)

  activeGenreRef.current = activeGenre
  visibleBatchSizeRef.current = visibleBatchSize

  useEffect(() => {
    function updateColumnCount() {
      setColumnCount(getDiscoverColumnCount(window.innerWidth))
    }

    updateColumnCount()
    window.addEventListener('resize', updateColumnCount)

    return () => {
      window.removeEventListener('resize', updateColumnCount)
    }
  }, [])

  useEffect(() => {
    setVisibleCount((currentValue) =>
      currentValue < visibleBatchSize ? visibleBatchSize : currentValue
    )
  }, [visibleBatchSize])

  useEffect(() => {
    if (genres.length > 0) {
      return
    }

    let isMounted = true

    async function fetchGenres() {
      const response = await TmdbService.getGenres()

      if (isMounted && Array.isArray(response.data)) {
        setGenres(response.data)
      }
    }

    fetchGenres()

    return () => {
      isMounted = false
    }
  }, [genres.length])

  useEffect(() => {
    if (skipInitialAllFetchRef.current && activeGenre === 'all') {
      skipInitialAllFetchRef.current = false
      return
    }

    skipInitialAllFetchRef.current = false
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    let isMounted = true

    async function fetchContent() {
      setStatus('loading')
      setLoadMoreStatus('idle')
      setErrorMessage('')

      try {
        const response = await TmdbService.discoverContent({
          genreId: activeGenre,
          page: 1,
        })

        if (!isMounted || requestIdRef.current !== requestId) {
          return
        }

        if (!Array.isArray(response.data?.results)) {
          throw new Error('Invalid discover response')
        }

        const nextPageInfo = getPageInfo(response.data)

        setItems(dedupeItems(response.data.results))
        setVisibleCount(visibleBatchSizeRef.current)
        setPage(nextPageInfo.page)
        setHasMore(nextPageInfo.hasMore)
        setStatus('idle')
      } catch {
        if (!isMounted || requestIdRef.current !== requestId) {
          return
        }

        setStatus('error')
        setErrorMessage('Movies could not be refreshed right now.')
      }
    }

    fetchContent()

    return () => {
      isMounted = false
    }
  }, [activeGenre, reloadKey])

  const handleLoadMore = useCallback(async () => {
    if (visibleCount < items.length) {
      setVisibleCount((currentValue) =>
        Math.min(currentValue + visibleBatchSize, items.length)
      )
      return
    }

    if (loadMoreStatus === 'loading' || !hasMore) {
      return
    }

    const requestGenre = activeGenreRef.current
    const nextPage = page + 1

    setLoadMoreStatus('loading')
    setErrorMessage('')

    try {
      const response = await TmdbService.discoverContent({
        genreId: requestGenre,
        page: nextPage,
      })

      if (activeGenreRef.current !== requestGenre) {
        return
      }

      if (!Array.isArray(response.data?.results)) {
        throw new Error('Invalid discover response')
      }

      const nextPageInfo = getPageInfo(response.data)

      const nextItems = dedupeItems([...items, ...response.data.results])

      setItems(nextItems)
      setVisibleCount((currentValue) =>
        Math.min(currentValue + visibleBatchSize, nextItems.length)
      )
      setPage(nextPageInfo.page)
      setHasMore(nextPageInfo.hasMore)
      setLoadMoreStatus('idle')
    } catch {
      if (activeGenreRef.current !== requestGenre) {
        return
      }

      setLoadMoreStatus('error')
      setErrorMessage('More titles could not be loaded right now.')
    }
  }, [hasMore, items, loadMoreStatus, page, visibleBatchSize, visibleCount])

  const showGrid = items.length > 0
  const visibleItems = items.slice(0, visibleCount)
  const showInitialLoading = status === 'loading' && !showGrid
  const showEmptyState = !showGrid && status !== 'loading'
  const showInlineStatus = Boolean(errorMessage) && showGrid
  const isRefreshing = status === 'loading' && showGrid
  const isLoadingMore = loadMoreStatus === 'loading'
  const canRevealMore = visibleCount < items.length
  const canRequestMore = hasMore && !canRevealMore

  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-col">
        <div className="-m-1 flex items-center gap-2 overflow-x-auto p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => {
              setActiveGenre('all')
            }}
            className={getGenreButtonClass(activeGenre === 'all')}
          >
            All
          </button>

          {genres.map((genre) => (
            <button
              key={genre.id}
              type="button"
              onClick={() => {
                setActiveGenre(genre.id.toString())
              }}
              className={getGenreButtonClass(
                activeGenre === genre.id.toString()
              )}
            >
              {genre.name}
            </button>
          ))}
        </div>
      </div>

      {showInitialLoading ? (
        <div className="flex h-[300px] w-full items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Icon
              icon="solar:spinner-bold"
              size={32}
              className="animate-spin text-white"
            />
            <p className="text-sm font-medium text-white/70">Loading movies...</p>
          </div>
        </div>
      ) : showGrid ? (
        <div className="relative">
          <motion.div
            key={activeGenre}
            className={cn(
              'grid gap-3 transition-opacity',
              'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8',
              isRefreshing && 'opacity-45'
            )}
            variants={STAGGER_CONTAINER}
            initial="hidden"
            animate="visible"
          >
            {visibleItems.map((item, index) => (
              <MediaPosterCard
                key={`${item.id}-movie`}
                item={item}
                imagePriority={index < 8}
                imageFetchPriority={index < 8 ? 'high' : undefined}
              />
            ))}
          </motion.div>

          {isRefreshing && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="border border-white/5 /85 px-4 py-2">
                <div className="flex items-center gap-3">
                  <Icon
                    icon="solar:spinner-bold"
                    size={22}
                    className="animate-spin text-white"
                  />
                  <span className="text-sm font-medium text-white">Updating...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : showEmptyState ? (
        <div className="flex h-[300px] w-full flex-col items-center justify-center gap-3 text-white">
          <Icon icon="solar:ghost-bold" size={48} />
          <p className="text-sm font-semibold tracking-wide">
            {status === 'error'
              ? 'Movies could not be loaded right now'
              : 'No results found'}
          </p>
          {status === 'error' && (
            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              className="border border-white/10  px-4 py-2 text-xs font-semibold tracking-widest text-white uppercase transition-colors hover:border-white/20"
            >
              Try Again
            </button>
          )}
        </div>
      ) : null}

      {showInlineStatus && (
        <p className="text-sm font-medium text-white/70">{errorMessage}</p>
      )}

      {(canRevealMore || canRequestMore) && status !== 'loading' && showGrid && (
        <div className="mt-6 flex justify-center pb-4">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="group flex items-center gap-2 rounded-full border border-white/20  px-5 py-2.5 text-xs font-semibold tracking-wider uppercase text-white transition-all duration-300 hover: hover:text-white hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover: disabled:hover:text-white"
          >
            {isLoadingMore ? (
              <>
                <Icon
                  icon="solar:spinner-bold"
                  size={14}
                  className="animate-spin"
                />
                Loading
              </>
            ) : (
              <>
                <Icon
                  icon="solar:refresh-bold"
                  size={14}
                  className="transition-transform duration-300 group-hover:rotate-180"
                />
                {canRevealMore ? 'Show More' : 'Load More'}
              </>
            )}
          </button>
        </div>
      )}
    </section>
  )
}
