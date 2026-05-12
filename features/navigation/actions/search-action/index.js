'use client';

import { startTransition, useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { useDebounce } from '@/core/hooks/use-debounce';
import { useNavigation } from '@/core/modules/nav/hooks';
import { cn } from '@/core/utils';

import { SEARCH_ACTION_TAB_ITEMS, SEARCH_LIMITS, SEARCH_STYLES, SEARCH_TAB_ITEMS, SEARCH_TYPES } from '@/features/search/constants';
import SearchActionControls from './components/controls';
import SearchResultItem from './components/item';
import {
  FEATURE_NAV_ACTION_BUTTON_MOTION,
  SEARCH_ACTION_FADE_MOTION,
  SEARCH_ACTION_PANEL_MOTION,
  getSearchActionItemMotion,
} from '@/features/motion';
import {
  fetchAllMedia,
  fetchMedia,
  fetchUsers,
  limitMediaResults,
  mergeAllResults,
} from '@/features/search/client-data';
import { inferSearchType } from '@/features/search/ranking';
import { getDetailPath } from '@/features/search/result';

const SEARCH_ACTION_VARIANTS = Object.freeze({
  DEFAULT: 'default',
  PAGE: 'page',
});

const SEARCH_ACTION_ALLOWED_TYPES = new Set([SEARCH_TYPES.ALL, SEARCH_TYPES.MOVIE, SEARCH_TYPES.PERSON, SEARCH_TYPES.USER]);

function resolveSearchActionType(type) {
  return SEARCH_ACTION_ALLOWED_TYPES.has(type) ? type : SEARCH_TYPES.ALL;
}

function resolveNavActionTone(tone, isActive) {
  if (!tone || tone === 'toggle') {
    return isActive ? SEARCH_STYLES.action.active : SEARCH_STYLES.action.muted;
  }

  return SEARCH_STYLES.action[tone] || SEARCH_STYLES.action.muted;
}

function navActionClass({ button = '', isActive = false, tone, className } = {}) {
  return cn(button, resolveNavActionTone(tone, isActive), className);
}

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
  const rawSearchType = isSearchTypeControlled ? controlledSearchType : localSearchType;
  const searchType = isPageVariant ? rawSearchType : resolveSearchActionType(rawSearchType);
  const loading = isPageVariant ? Boolean(controlledLoading) : localLoading;
  const debouncedQuery = useDebounce(query, 500);
  const { expanded, navigate, setCompactLock, setExpanded } = useNavigation();

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

          nextSearchType = resolveSearchActionType(
            inferSearchType({
              communityResults: [],
              normalizedQuery,
              userResults,
              mediaResults,
            })
          );

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

        nextSearchType = resolveSearchActionType(nextSearchType);

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

  useEffect(() => {
    if (isPageVariant) {
      return undefined;
    }

    const shouldLockCompact = Boolean(query.trim() || loading || results.length > 0);
    setCompactLock('search-action', shouldLockCompact);

    return () => {
      setCompactLock('search-action', false);
    };
  }, [isPageVariant, loading, query, results.length, setCompactLock]);

  return (
    <div className="mt-2.5 w-full">
      <SearchActionControls
        loading={loading}
        query={query}
        searchType={searchType}
        showTabsWhenEmpty={isPageVariant}
        tabItems={isPageVariant ? SEARCH_TAB_ITEMS : SEARCH_ACTION_TAB_ITEMS}
        onClear={handleClear}
        onQueryChange={handleQueryChange}
        onSearchTypeChange={handleSearchTypeChange}
      />
      {!isPageVariant ? (
        <>
          <AnimatePresence initial={false}>
            {results.length > 0 && query ? (
              <motion.div
                key="search-results"
                className="mt-2 flex flex-col gap-1 overflow-hidden"
                {...SEARCH_ACTION_PANEL_MOTION}
              >
                {results.map((item, index) => (
                  <motion.div
                    key={`${item.media_type}-${item.id}`}
                    {...getSearchActionItemMotion(index)}
                  >
                    <SearchResultItem
                      key={`${item.media_type}-${item.id}`}
                      item={item}
                      imageErrors={imageErrors}
                      onImageError={handleImageError}
                      onSelect={handleSelect}
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {query.trim() ? (
              <motion.div
                key="search-see-all"
                className="mt-2 overflow-hidden"
                {...SEARCH_ACTION_FADE_MOTION}
              >
                <motion.button
                  key={`see-all-${searchType}`}
                  type="button"
                  {...FEATURE_NAV_ACTION_BUTTON_MOTION}
                  {...getSearchActionItemMotion(2, 'searchTabs')}
                  className={navActionClass({
                    button: 'relative w-full shrink-0 px-3 py-1.5 text-left text-xs whitespace-nowrap transition-colors',
                    cn,
                  })}
                  onClick={handleSeeAllResults}
                >
                  See all results
                </motion.button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </>
      ) : null}
    </div>
  );
}
