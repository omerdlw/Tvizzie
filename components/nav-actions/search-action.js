'use client'

import { useEffect, useState } from 'react'

import Image from 'next/image'

import { AnimatePresence, motion } from 'framer-motion'

import SegmentedControl from '@/components/shared/segmented-control'
import { DURATION, EASING, TMDB_IMG } from '@/lib/constants'
import { useDebounce } from '@/lib/hooks'
import { useNavigation } from '@/modules/nav/hooks'
import { searchUserProfiles } from '@/services/profile.service'
import { TmdbService } from '@/services/tmdb.service'
import { Input } from '@/ui/elements'
import Icon from '@/ui/icon'

import { navActionClass } from './constants'

const MAX_RESULTS = 6
const MEDIA_RESULTS_LIMIT = 4
const USER_RESULTS_LIMIT = 4
const STYLES = Object.freeze({
  input:
    'relative flex h-11 w-full items-center rounded-[20px] p-2.5 pl-4 font-semibold transition-colors duration-[var(--motion-duration-fast)]',
  tabButton:
    'w-full flex-auto rounded-[20px] border border-white/5 px-3 py-2 text-[11px] tracking-wide whitespace-nowrap transition-colors',
})

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
          wrapper: navActionClass({
            button: STYLES.input,
            tone: 'muted',
            className: 'focus-within:ring-white/20 focus-within:bg-white/10',
          }),
          leftIcon: 'center mr-2 shrink-0',
          input:
            'w-full bg-transparent text-base text-white placeholder-white/50 outline-none sm:text-sm',
          rightIcon: '-mr-0.5 flex h-full items-center',
        }}
        leftIcon={
          <Icon
            className={`${isFocused || query ? 'text-white' : 'text-white/50'} transition-colors duration-[var(--motion-duration-normal)]`}
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
            transition={{ duration: DURATION.QUICK, ease: EASING.EASE_OUT }}
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
                  className="group flex cursor-pointer items-center justify-between rounded-[20px] p-1 transition-all duration-[var(--motion-duration-fast)] hover:bg-white/10"
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
                          className="h-full w-full object-cover transition-transform duration-[var(--motion-duration-moderate)] group-hover:scale-105"
                        />
                      ) : imagePath &&
                        !imageErrors[`${item.media_type}-${item.id}`] ? (
                        <Image
                          src={`${TMDB_IMG}/w92${imagePath}`}
                          alt={title}
                          fill
                          className="object-cover transition-transform duration-[var(--motion-duration-moderate)] group-hover:scale-105"
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
            className="mt-2"
            animate={{ opacity: 1, height: 'auto' }}
            initial={{ opacity: 0, height: 0 }}
            exit={{ opacity: 0, height: 0 }}
          >
            <SegmentedControl
              className="w-full"
              trackClassName="w-full gap-2 overflow-visible bg-transparent p-0 ring-0"
              items={[
                { key: 'multi', label: 'All' },
                { key: 'movie', label: 'Movies' },
                { key: 'tv', label: 'TV Shows' },
                { key: 'person', label: 'People' },
                { key: 'user', label: 'Users' },
              ]}
              value={searchType}
              onChange={(value) => {
                setSearchType(value)
                setIsManualTab(true)
              }}
              activeClassName=""
              inactiveClassName=""
              getButtonClassName={(item, isActive) => {
                const isAllTab = item.key === 'multi'

                return navActionClass({
                  button: STYLES.tabButton,
                  tone: 'toggle',
                  isActive,
                  className: isAllTab ? 'w-full flex-auto' : 'w-full flex-auto',
                })
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
