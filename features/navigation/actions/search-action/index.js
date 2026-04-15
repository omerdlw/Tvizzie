'use client';

import { startTransition, useCallback, useEffect, useState } from 'react';

import { AnimatePresence, motion } from 'framer-motion';

import { DURATION, EASING } from '@/core/constants';
import { useDebounce } from '@/core/hooks';
import { useNavigation } from '@/core/modules/nav/hooks';
import { cn } from '@/core/utils';

import { SEARCH_LIMITS, SEARCH_TYPES } from './constants';
import SearchActionControls from './parts/controls';
import SearchResultItem from './parts/item';
import {
  fetchAllMedia,
  fetchMedia,
  fetchUsers,
  getDetailPath,
  inferSearchType,
  limitMediaResults,
  mergeAllResults,
  navActionClass,
} from './utils';

const SEARCH_ACTION_VARIANTS = Object.freeze({
  DEFAULT: 'default',
  PAGE: 'page',
});

export default function SearchAction({
  loading: controlledLoading = false,
  query: controlledQuery,
  searchType: controlledSearchType,
  variant = SEARCH_ACTION_VARIANTS.DEFAULT,
  onQueryChange,
  onSearchTypeChange,
}) {
  const isPageVariant = variant === SEARCH_ACTION_VARIANTS.PAGE;
  const isQueryControlled = typeof controlledQuery === 'string';
  const isSearchTypeControlled = typeof controlledSearchType === 'string';

  const [localQuery, setLocalQuery] = useState('');
  const [localSearchType, setLocalSearchType] = useState(SEARCH_TYPES.ALL);
  const [isManualTab, setIsManualTab] = useState(false);
  const [results, setResults] = useState([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [imageErrors, setImageErrors] = useState({});

  const query = isQueryControlled ? controlledQuery : localQuery;
  const searchType = isSearchTypeControlled ? controlledSearchType : localSearchType;
  const loading = isPageVariant ? Boolean(controlledLoading) : localLoading;
  const debouncedQuery = useDebounce(query, 500);
  const { expanded, navigate, setExpanded } = useNavigation();

  const handleQueryChange = useCallback(
    (nextQuery) => {
      if (!isQueryControlled) {
        setLocalQuery(nextQuery);
      }

      onQueryChange?.(nextQuery);

      if (!isPageVariant) {
        setIsManualTab(false);
      }
    },
    [isPageVariant, isQueryControlled, onQueryChange]
  );

  const handleSearchTypeChange = useCallback(
    (nextSearchType) => {
      if (!isSearchTypeControlled) {
        setLocalSearchType(nextSearchType);
      }

      onSearchTypeChange?.(nextSearchType);

      if (!isPageVariant) {
        setIsManualTab(true);
      }
    },
    [isPageVariant, isSearchTypeControlled, onSearchTypeChange]
  );

  const handleClear = useCallback(() => {
    handleQueryChange('');
    setResults([]);

    if (!isPageVariant) {
      if (!isSearchTypeControlled) {
        setLocalSearchType(SEARCH_TYPES.ALL);
      }

      setIsManualTab(false);
    }
  }, [handleQueryChange, isPageVariant, isSearchTypeControlled]);

  const handleImageError = useCallback((key) => {
    setImageErrors((prev) => ({
      ...prev,
      [key]: true,
    }));
  }, []);

  const handleSelect = useCallback(
    (item) => {
      const path = getDetailPath(item);

      if (!path) {
        return;
      }

      if (typeof document !== 'undefined') {
        document.activeElement?.blur?.();
      }

      setExpanded(false);
      handleClear();
      navigate(path);
    },
    [handleClear, navigate, setExpanded]
  );

  const handleSeeAllResults = useCallback(() => {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return;
    }

    const params = new URLSearchParams({
      q: normalizedQuery,
      type: searchType,
    });

    navigate(`/search?${params.toString()}`);
  }, [navigate, query, searchType]);

  useEffect(() => {
    if (isPageVariant) {
      return undefined;
    }

    if (!debouncedQuery?.trim()) {
      setResults([]);

      if (!isSearchTypeControlled) {
        setLocalSearchType(SEARCH_TYPES.ALL);
      }

      setIsManualTab(false);
      setLocalLoading(false);
      return undefined;
    }

    let isCancelled = false;

    async function runSearch() {
      setLocalLoading(true);

      try {
        const normalizedQuery = debouncedQuery.trim().toLowerCase();
        let nextSearchType = isManualTab ? searchType : SEARCH_TYPES.ALL;

        let userResults = [];
        let mediaResults = [];

        if (!isManualTab) {
          const [fetchedUsers, fetchedMedia] = await Promise.all([
            fetchUsers(debouncedQuery),
            fetchAllMedia(debouncedQuery),
          ]);

          userResults = fetchedUsers;
          mediaResults = fetchedMedia;

          nextSearchType = inferSearchType({
            normalizedQuery,
            userResults,
            mediaResults,
          });

          if (!isCancelled && !isSearchTypeControlled) {
            startTransition(() => {
              setLocalSearchType(nextSearchType);
            });
          }
        }

        if (nextSearchType === SEARCH_TYPES.USER) {
          if (!userResults.length) {
            userResults = await fetchUsers(debouncedQuery);
          }

          if (!isCancelled) {
            startTransition(() => {
              setResults(userResults.slice(0, SEARCH_LIMITS.MAX_RESULTS));
            });
          }

          return;
        }

        if (nextSearchType === SEARCH_TYPES.ALL) {
          if (!userResults.length) {
            userResults = await fetchUsers(debouncedQuery);
          }

          if (!mediaResults.length) {
            mediaResults = await fetchAllMedia(debouncedQuery);
          }

          if (!isCancelled) {
            startTransition(() => {
              setResults(mergeAllResults(userResults, mediaResults));
            });
          }

          return;
        }

        const typedMediaResults = await fetchMedia(debouncedQuery, nextSearchType);

        if (!isCancelled) {
          startTransition(() => {
            setResults(limitMediaResults(typedMediaResults));
          });
        }
      } catch {
        if (!isCancelled) {
          startTransition(() => {
            setResults([]);
          });
        }
      } finally {
        if (!isCancelled) {
          setLocalLoading(false);
        }
      }
    }

    runSearch();

    return () => {
      isCancelled = true;
    };
  }, [debouncedQuery, isManualTab, isPageVariant, isSearchTypeControlled, searchType]);

  useEffect(() => {
    if (!isPageVariant && !expanded) {
      handleClear();
    }
  }, [expanded, handleClear, isPageVariant]);

  return (
    <motion.div className="mt-2.5 w-full" layout="position">
      <SearchActionControls
        loading={loading}
        query={query}
        searchType={searchType}
        showTabsWhenEmpty={isPageVariant}
        onClear={handleClear}
        onQueryChange={handleQueryChange}
        onSearchTypeChange={handleSearchTypeChange}
      />
      {!isPageVariant ? (
        <>
          <AnimatePresence>
            {results.length > 0 && query ? (
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
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {query.trim() ? (
              <motion.div
                className="mt-2 overflow-hidden"
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
              >
                <button
                  type="button"
                  className={navActionClass({
                    button:
                      'relative w-full shrink-0 rounded-[14px] px-3 py-1.5 text-left text-xs whitespace-nowrap transition-colors',
                    cn,
                  })}
                  onClick={handleSeeAllResults}
                >
                  See all results
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </>
      ) : null}
    </motion.div>
  );
}
