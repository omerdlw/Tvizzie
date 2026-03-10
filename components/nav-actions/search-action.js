'use client'

import { useEffect, useState } from 'react'

import Image from 'next/image'

import { AnimatePresence, motion } from 'framer-motion'

import { useDebounce } from '@/lib/hooks'
import { useNavigation } from '@/modules/nav/hooks'
import { TmdbService } from '@/services/tmdb.service'
import { Input } from '@/ui/elements'
import Icon from '@/ui/icon'

export default function SearchAction() {
  const [query, setQuery] = useState('')
  const [searchType, setSearchType] = useState('multi')
  const [isManualTab, setIsManualTab] = useState(false)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [imageErrors, setImageErrors] = useState({})
  const debouncedQuery = useDebounce(query, 500)
  const { expanded, navigate, setExpanded } = useNavigation()

  const resolveDetailPath = (item) => {
    const type = item?.media_type
    if (!type || !item?.id) return null
    if (type === 'movie') return `/movie/detail/${item.id}`
    if (type === 'tv') return `/tv/detail/${item.id}`
    if (type === 'person') return `/person/detail/${item.id}`
    return null
  }

  const handleSelect = (item) => {
    const path = resolveDetailPath(item)
    if (!path) return
    setExpanded(false)
    setQuery('')
    setResults([])
    navigate(path)
  }

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([])
      setSearchType('multi')
      setIsManualTab(false)
      return
    }

    const fetchSearch = async () => {
      setLoading(true)

      let currentSearchType = searchType

      if (!isManualTab) {
        const multiRes = await TmdbService.searchContent(
          debouncedQuery,
          'multi'
        )
        if (multiRes.status === 200 && multiRes.data?.results?.length > 0) {
          const topResult = multiRes.data.results[0]
          const exactMatch = multiRes.data.results.find(
            (r) =>
              (r.title || r.name)?.toLowerCase() ===
              debouncedQuery.toLowerCase()
          )

          const inferredType = exactMatch
            ? exactMatch.media_type
            : topResult.media_type

          if (inferredType && inferredType !== 'multi') {
            currentSearchType = inferredType
            setSearchType(inferredType)
          }
        }
      }

      const res = await TmdbService.searchContent(
        debouncedQuery,
        currentSearchType
      )
      if (res.status === 200 && res.data?.results) {
        setResults(res.data.results.slice(0, 4))
      }
      setLoading(false)
    }

    fetchSearch()
  }, [debouncedQuery, isManualTab, searchType])

  useEffect(() => {
    if (!expanded) {
      setQuery('')
      setIsFocused(false)
    }
  }, [expanded])

  return (
    <motion.div className="mt-2.5 w-full" layout="position">
      <Input
        classNames={{
          wrapper: `relative flex flex-1 w-full items-center px-4 py-2 transition-all duration-300 rounded-[20px] bg-white/5 ring-1 ring-white/10 focus-within:ring-white/15 focus-within:bg-white/10`,
          leftIcon: 'center mr-2 shrink-0',
          input:
            'w-full bg-transparent text-sm text-white placeholder-white/50 outline-none',
          rightIcon: 'flex items-center h-full',
        }}
        leftIcon={
          <Icon
            icon="solar:magnifer-linear"
            size={16}
            className={`${isFocused || query ? 'text-white' : 'text-white/50'} transition-colors duration-300`}
          />
        }
        placeholder="Search movies, tv shows or people..."
        onChange={(e) => {
          setQuery(e.target.value)
          setIsManualTab(false)
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        spellCheck="false"
        value={query}
        rightIcon={
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex h-8 w-8 shrink-0 items-center justify-center"
              >
                <Icon
                  icon="line-md:loading-loop"
                  size={16}
                  className="text-black"
                />
              </motion.div>
            ) : query ? (
              <motion.button
                key="clear"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setQuery('')}
                className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Icon icon="solar:close-circle-bold" size={20} />
              </motion.button>
            ) : null}
          </AnimatePresence>
        }
      />

      <AnimatePresence>
        {results.length > 0 && query && (
          <motion.div
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-2 flex flex-col gap-1"
            initial={{ opacity: 0, height: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            layout="position"
          >
            {results.map((item) => {
              const imagePath =
                item.poster_path || item.profile_path || item.backdrop_path
              const title = item.title || item.name
              const subtitle =
                item.media_type === 'movie'
                  ? 'MOVIE'
                  : item.media_type === 'tv'
                    ? 'TV'
                    : 'PERSON'
              const year = (
                item.release_date ||
                item.first_air_date ||
                ''
              )?.substring(0, 4)

              return (
                <div
                  key={item.id}
                  className="group flex cursor-pointer items-center justify-between rounded-[20px] p-1 transition-all duration-200 hover:bg-white/10"
                  onClick={() => {
                    handleSelect(item)
                  }}
                >
                  <div className="flex min-w-0 items-center gap-3.5">
                    <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-[16px] border border-white/5 bg-black/40">
                      {imagePath && !imageErrors[item.id] ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w92${imagePath}`}
                          alt={title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={() =>
                            setImageErrors((prev) => ({
                              ...prev,
                              [item.id]: true,
                            }))
                          }
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-white/20">
                          <Icon
                            icon={
                              item.media_type === 'person'
                                ? 'solar:user-bold'
                                : 'solar:gallery-bold'
                            }
                            size={18}
                          />
                        </div>
                      )}
                    </div>
                    <div className="mr-2.5 flex min-w-0 flex-1 flex-col justify-center gap-1.5">
                      <span className="truncate text-[15px] leading-tight font-semibold text-white/95 transition-all">
                        {title}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="rounded-[6px] bg-black/20 px-1.5 py-1 text-[9px] font-semibold tracking-widest text-white/50">
                          {subtitle}
                        </span>
                        {year && (
                          <span className="text-[12px] font-medium text-white/40">
                            {year}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {query && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="hide-scrollbar mt-2 flex items-center gap-2 overflow-x-auto"
          >
            {[
              { id: 'multi', label: 'All' },
              { id: 'movie', label: 'Movies' },
              { id: 'tv', label: 'TV Shows' },
              { id: 'person', label: 'People' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setSearchType(tab.id)
                  setIsManualTab(true)
                }}
                className={`w-full flex-auto rounded-[20px] border border-white/5 px-3 py-2.5 text-xs font-bold tracking-wide whitespace-nowrap transition-colors ${searchType === tab.id ? 'bg-white/15 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
              >
                {tab.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
