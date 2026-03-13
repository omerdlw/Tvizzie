'use client'

import { useEffect, useState } from 'react'

import Image from 'next/image'

import { AnimatePresence, motion } from 'framer-motion'

import { useDebounce } from '@/lib/hooks'
import { useNavigation } from '@/modules/nav/hooks'
import { searchUserProfiles } from '@/services/profile.service'
import { TmdbService } from '@/services/tmdb.service'
import { Input } from '@/ui/elements'
import Icon from '@/ui/icon'

import { navActionBaseClass } from './constants'

const MAX_RESULTS = 6
const MEDIA_RESULTS_LIMIT = 4
const USER_RESULTS_LIMIT = 4

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

  const getAvatarUrl = (profile) => {
    const seed = profile?.username || profile?.id || 'tvizzie'
    return (
      profile?.avatarUrl ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`
    )
  }

  const normalizeResult = (item, type = item?.media_type) => ({
    ...item,
    media_type: type,
  })

  const resolveDetailPath = (item) => {
    const type = item?.media_type
    if (!type || !item?.id) return null
    if (type === 'movie') return `/movie/${item.id}`
    if (type === 'tv') return `/tv/${item.id}`
    if (type === 'person') return `/person/${item.id}`
    if (type === 'user') return `/profile/${item.username || item.id}`
    return null
  }

  const handleSelect = (item) => {
    const path = resolveDetailPath(item)
    if (!path) return
    if (typeof document !== 'undefined') {
      document.activeElement?.blur?.()
    }
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
      setLoading(false)
      return
    }

    let isActive = true

    const fetchSearch = async () => {
      setLoading(true)

      try {
        const normalizedQuery = debouncedQuery.trim().toLowerCase()
        let currentSearchType = isManualTab ? searchType : 'multi'
        let mediaResults = []
        let userResults = []
        let hasLoadedMultiMedia = false
        let hasLoadedUsers = false

        if (!isManualTab) {
          const [multiRes, matchedUsers] = await Promise.all([
            TmdbService.searchContent(debouncedQuery, 'multi'),
            searchUserProfiles(debouncedQuery, {
              limitCount: USER_RESULTS_LIMIT,
            }),
          ])

          hasLoadedMultiMedia = true
          hasLoadedUsers = true
          userResults = matchedUsers.map((item) =>
            normalizeResult(item, 'user')
          )

          const exactUserMatch = userResults.find((item) => {
            const displayName = String(item.displayName || '')
              .trim()
              .toLowerCase()
            const username = String(item.username || '')
              .trim()
              .toLowerCase()

            return (
              displayName === normalizedQuery || username === normalizedQuery
            )
          })

          if (exactUserMatch) {
            currentSearchType = 'user'
            setSearchType('user')
          } else if (
            multiRes.status === 200 &&
            multiRes.data?.results?.length > 0
          ) {
            const topResult = multiRes.data.results[0]
            const exactMatch = multiRes.data.results.find(
              (r) => (r.title || r.name)?.toLowerCase() === normalizedQuery
            )
            const inferredType = exactMatch
              ? exactMatch.media_type
              : topResult.media_type

            if (inferredType) {
              currentSearchType = inferredType
              setSearchType(inferredType)
            }
          }

          mediaResults =
            multiRes.status === 200 && multiRes.data?.results
              ? multiRes.data.results.map((item) => normalizeResult(item))
              : []
        }

        if (currentSearchType === 'user') {
          if (!hasLoadedUsers) {
            userResults = (
              await searchUserProfiles(debouncedQuery, {
                limitCount: USER_RESULTS_LIMIT,
              })
            ).map((item) => normalizeResult(item, 'user'))
          }

          if (isActive) {
            setResults(userResults.slice(0, MAX_RESULTS))
          }
          return
        }

        if (currentSearchType === 'multi') {
          if (!hasLoadedUsers) {
            userResults = (
              await searchUserProfiles(debouncedQuery, {
                limitCount: USER_RESULTS_LIMIT,
              })
            ).map((item) => normalizeResult(item, 'user'))
          }

          if (!hasLoadedMultiMedia) {
            const multiRes = await TmdbService.searchContent(
              debouncedQuery,
              'multi'
            )
            mediaResults =
              multiRes.status === 200 && multiRes.data?.results
                ? multiRes.data.results.map((item) => normalizeResult(item))
                : []
          }

          if (isActive) {
            setResults([...userResults, ...mediaResults].slice(0, MAX_RESULTS))
          }
          return
        }

        const res = await TmdbService.searchContent(
          debouncedQuery,
          currentSearchType
        )

        if (!isActive) {
          return
        }

        if (res.status === 200 && res.data?.results) {
          setResults(
            res.data.results
              .map((item) => normalizeResult(item))
              .slice(0, MEDIA_RESULTS_LIMIT)
          )
        } else {
          setResults([])
        }
      } catch {
        if (isActive) {
          setResults([])
        }
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    fetchSearch()

    return () => {
      isActive = false
    }
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
          wrapper: navActionBaseClass({
            layout: 'relative flex flex-1 w-full items-center',
            padding: 'p-2.5 pl-4',
            typography: '',
            className:
              'bg-white/5 ring-1 ring-white/10 focus-within:ring-white/15 focus-within:bg-white/10',
          }),
          leftIcon: 'center mr-2 shrink-0',
          input:
            'w-full bg-transparent text-base text-white placeholder-white/50 outline-none sm:text-sm',
          rightIcon: '-mr-0.5 flex h-full items-center',
        }}
        leftIcon={
          <Icon
            className={`${isFocused || query ? 'text-white' : 'text-white/50'} transition-colors duration-300`}
            icon="solar:magnifer-linear"
            size={20}
          />
        }
        placeholder="Search movies, tv shows, people or users"
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
                className="center h-8 w-8 shrink-0"
              >
                <Icon icon="line-md:loading-loop" size={20} />
              </motion.div>
            ) : query ? (
              <motion.button
                type="button"
                key="clear"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setQuery('')}
                className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Icon icon="material-symbols:close-rounded" size={20} />
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
                item.media_type === 'user'
                  ? null
                  : item.poster_path || item.profile_path || item.backdrop_path
              const title =
                item.media_type === 'user'
                  ? item.displayName || item.username
                  : item.title || item.name
              const subtitle =
                item.media_type === 'user'
                  ? 'USER'
                  : item.media_type === 'movie'
                    ? 'MOVIE'
                    : item.media_type === 'tv'
                      ? 'TV'
                      : 'PERSON'
              const secondaryLabel =
                item.media_type === 'user' && item.username
                  ? `@${item.username}`
                  : null
              const year = (
                item.release_date ||
                item.first_air_date ||
                ''
              )?.substring(0, 4)

              return (
                <div
                  key={`${item.media_type}-${item.id}`}
                  className="group flex cursor-pointer items-center justify-between rounded-[20px] p-1 transition-all duration-200 hover:bg-white/10"
                  onClick={() => {
                    handleSelect(item)
                  }}
                >
                  <div className="flex min-w-0 items-center gap-3.5">
                    <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-[16px] border border-white/5 bg-black/40">
                      {item.media_type === 'user' ? (
                        <img
                          src={getAvatarUrl(item)}
                          alt={title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : imagePath &&
                        !imageErrors[`${item.media_type}-${item.id}`] ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w92${imagePath}`}
                          alt={title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={() =>
                            setImageErrors((prev) => ({
                              ...prev,
                              [`${item.media_type}-${item.id}`]: true,
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
                        {secondaryLabel && (
                          <span className="truncate text-[12px] font-medium text-white/40">
                            {secondaryLabel}
                          </span>
                        )}
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
            className="hide-scrollbar mt-2 flex items-center gap-2 overflow-x-auto"
            animate={{ opacity: 1, height: 'auto' }}
            initial={{ opacity: 0, height: 0 }}
            exit={{ opacity: 0, height: 0 }}
          >
            {[
              { id: 'multi', label: 'All' },
              { id: 'movie', label: 'Movies' },
              { id: 'tv', label: 'TV Shows' },
              { id: 'person', label: 'People' },
              { id: 'user', label: 'Users' },
            ].map((tab) => (
              <button
                type="button"
                key={tab.id}
                onClick={() => {
                  setSearchType(tab.id)
                  setIsManualTab(true)
                }}
                className={navActionBaseClass({
                  padding: 'px-3 py-2',
                  transition: 'transition-colors',
                  typography:
                    'text-[11px] font-bold tracking-wide whitespace-nowrap',
                  className: `w-full flex-auto border border-white/5 ${
                    searchType === tab.id
                      ? 'bg-white/15 text-white'
                      : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                  }`,
                })}
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
