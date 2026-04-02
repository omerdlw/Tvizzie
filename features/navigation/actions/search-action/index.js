'use client'

import { startTransition, useEffect, useState } from 'react'

import { AnimatePresence, motion } from 'framer-motion'

import { DURATION, EASING } from '@/lib/constants'
import { useDebounce } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import { useNavigation } from '@/modules/nav/hooks'
import { Input } from '@/ui/elements'
import Icon from '@/ui/icon'

import {
  SEARCH_LIMITS,
  SEARCH_STYLES,
  SEARCH_TAB_ITEMS,
  SEARCH_TYPES,
} from './constants'
import SearchResultItem from './parts/item'
import {
  fetchAllMedia,
  fetchMedia,
  fetchUsers,
  getDetailPath,
  inferSearchType,
  limitMediaResults,
  mergeAllResults,
  navActionClass,
} from './utils'

export default function SearchAction() {
  const [query, setQuery] = useState('')
  const [searchType, setSearchType] = useState(SEARCH_TYPES.ALL)
  const [isManualTab, setIsManualTab] = useState(false)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [imageErrors, setImageErrors] = useState({})

  const debouncedQuery = useDebounce(query, 500)
  const { expanded, navigate, setExpanded } = useNavigation()

  const handleImageError = (key) => {
    setImageErrors((prev) => ({
      ...prev,
      [key]: true,
    }))
  }

  const handleSelect = (item) => {
    const path = getDetailPath(item)

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
    if (!debouncedQuery?.trim()) {
      setResults([])
      setSearchType(SEARCH_TYPES.ALL)
      setIsManualTab(false)
      setLoading(false)
      return
    }

    let isCancelled = false

    async function runSearch() {
      setLoading(true)

      try {
        const normalizedQuery = debouncedQuery.trim().toLowerCase()
        let nextSearchType = isManualTab ? searchType : SEARCH_TYPES.ALL

        let userResults = []
        let mediaResults = []

        if (!isManualTab) {
          const [fetchedUsers, fetchedMedia] = await Promise.all([
            fetchUsers(debouncedQuery),
            fetchAllMedia(debouncedQuery),
          ])

          userResults = fetchedUsers
          mediaResults = fetchedMedia

          nextSearchType = inferSearchType({
            normalizedQuery,
            userResults,
            mediaResults,
          })

          if (!isCancelled) {
            startTransition(() => {
              setSearchType(nextSearchType)
            })
          }
        }

        if (nextSearchType === SEARCH_TYPES.USER) {
          if (!userResults.length) {
            userResults = await fetchUsers(debouncedQuery)
          }

          if (!isCancelled) {
            startTransition(() => {
              setResults(userResults.slice(0, SEARCH_LIMITS.MAX_RESULTS))
            })
          }

          return
        }

        if (nextSearchType === SEARCH_TYPES.ALL) {
          if (!userResults.length) {
            userResults = await fetchUsers(debouncedQuery)
          }

          if (!mediaResults.length) {
            mediaResults = await fetchAllMedia(debouncedQuery)
          }

          if (!isCancelled) {
            startTransition(() => {
              setResults(mergeAllResults(userResults, mediaResults))
            })
          }

          return
        }

        const typedMediaResults = await fetchMedia(
          debouncedQuery,
          nextSearchType
        )

        if (!isCancelled) {
          startTransition(() => {
            setResults(limitMediaResults(typedMediaResults))
          })
        }
      } catch {
        if (!isCancelled) {
          startTransition(() => {
            setResults([])
          })
        }
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    runSearch()

    return () => {
      isCancelled = true
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
          input:
            'w-full bg-transparent text-white placeholder-white/50 outline-none',
          wrapper: navActionClass({
            cn,
            button: SEARCH_STYLES.input,
          }),
          leftIcon: 'center mr-2 shrink-0',
        }}
        leftIcon={
          <Icon
            className={`${isFocused || query ? 'text-white/70' : 'text-white/50'} transition-colors duration-(--motion-duration-normal)`}
            icon="solar:magnifer-linear"
            size={16}
          />
        }
        placeholder="Search movies, people or users"
        value={query}
        spellCheck={false}
        onChange={(event) => {
          setQuery(event.target.value)
          setIsManualTab(false)
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        rightIcon={
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                className="center shrink-0"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.8 }}
              >
                <Icon icon="line-md:loading-loop" size={16} />
              </motion.div>
            ) : query ? (
              <motion.button
                key="clear"
                type="button"
                className="center shrink-0 cursor-pointer text-white/50 hover:text-white"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.8 }}
                onClick={() => setQuery('')}
              >
                <Icon icon="material-symbols:close-rounded" size={16} />
              </motion.button>
            ) : null}
          </AnimatePresence>
        }
      />

      <AnimatePresence>
        {results.length > 0 && query && (
          <motion.div
            layout="position"
            className="mt-2 flex flex-col gap-1 overflow-hidden"
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: DURATION.QUICK, ease: EASING.EASE_OUT }}
          >
            {results.map((item) => (
              <SearchResultItem
                key={`${item.media_type}-${item.id}`}
                item={item}
                imageErrors={imageErrors}
                onImageError={handleImageError}
                onSelect={handleSelect}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {query && (
          <motion.div
            className="mt-2 overflow-hidden"
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
          >
            <div className={SEARCH_STYLES.tabList}>
              {SEARCH_TAB_ITEMS.map((item) => {
                const isActive = searchType === item.key

                return (
                  <button
                    key={item.key}
                    type="button"
                    className={cn(
                      navActionClass({
                        cn,
                        button: SEARCH_STYLES.tabButton,
                        isActive,
                      }),
                      'group'
                    )}
                    onClick={() => {
                      setSearchType(item.key)
                      setIsManualTab(true)
                    }}
                  >
                    <span className="relative">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
