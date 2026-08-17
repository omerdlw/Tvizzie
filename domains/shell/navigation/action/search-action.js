'use client';

import { useState, startTransition, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';

import { TMDB_IMG } from '@/domains/shell/shared/constants';
import {
  applyAvatarFallback,
  getUserAvatarFallbackUrl,
  getUserAvatarUrl,
} from '@/domains/account/utils/avatar';
import { cn, resolveImageLoading, resolveImageQuality } from '@/domains/shell/shared/utils';
import AdaptiveImage from '@/domains/shell/shared/components/adaptive-image';
import Icon from '@/ui/primitives/icon';
import { Input } from '@/ui/primitives';
import { useDebounce } from '@/domains/shell/shared/hooks/use-debounce';
import { useNavigation } from '@/modules/nav';
import {
  NAV_BUTTON_TRANSITION,
  NAV_FADE_TRANSITION,
  NAV_RESULTS_EXIT_TRANSITION,
  NAV_RESULTS_STAGGER_DELAY,
  NAV_RESULTS_TRANSITION,
  NAV_TAP_SCALE,
} from '@/modules/nav/motion';
import {
  SEARCH_LIMITS,
  SEARCH_TYPES,
} from '@/domains/search/utils/constants';
import {
  SEARCH_STYLES,
  SEARCH_TAB_ITEMS,
  navActionClass,
} from './constants';
import {
  getDetailPath,
  getImagePath,
  getItemDirector,
  getItemTitle,
  getItemYear,
} from '@/domains/search/utils/result';
import {
  fetchAllMedia,
  fetchMedia,
  fetchUsers,
  inferSearchType,
  limitMediaResults,
  mergeAllResults,
} from '@/domains/search/client/search-api';

export function PaginationArrow({ direction, onClick }) {
  const isLeft = direction === 'left';
  return (
    <div className={`shrink-0 overflow-hidden ${isLeft ? 'mr-1.5' : 'ml-1.5'}`}>
      <motion.button
        type="button"
        className={cn(
          navActionClass({
            cn,
            button: SEARCH_STYLES.tabButton,
            isActive: false,
          }),
          'center h-[38px] w-[38px] cursor-pointer p-0',
        )}
        onClick={onClick}
        whileHover={{ x: isLeft ? -2 : 2 }}
        whileTap={{ scale: NAV_TAP_SCALE }}
        transition={NAV_BUTTON_TRANSITION}
      >
        <Icon
          icon={isLeft ? 'solar:alt-arrow-left-linear' : 'solar:alt-arrow-right-linear'}
          size={16}
          className="text-white/70"
        />
      </motion.button>
    </div>
  );
}

export function SearchResultItem({ item, imageErrors = {}, onImageError, onSelect }) {
  const title = getItemTitle(item);
  const year = getItemYear(item);
  const director = getItemDirector(item);
  const imagePath = getImagePath(item);
  const itemKey = `${item.media_type}-${item.id}`;
  const hasImageError = imageErrors[itemKey];
  const detailPath = getDetailPath(item);
  const hasDetailPath = Boolean(detailPath);
  const userAvatarSrc = item.media_type === SEARCH_TYPES.USER ? getUserAvatarUrl(item) : '';
  const userAvatarFallbackSrc =
    item.media_type === SEARCH_TYPES.USER ? getUserAvatarFallbackUrl(item) : '';
  const rowContent = (
    <div className="flex w-full min-w-0 items-center gap-3">
      <div className={SEARCH_STYLES.thumbnail}>
        {item.media_type === SEARCH_TYPES.USER ? (
          <AdaptiveImage
            mode="img"
            className="h-full w-full object-cover"
            src={userAvatarSrc}
            alt={title}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            onError={(event) => applyAvatarFallback(event, userAvatarFallbackSrc)}
          />
        ) : imagePath && !hasImageError ? (
          <AdaptiveImage
            fill
            alt={title}
            className="object-cover"
            onError={() => onImageError?.(itemKey)}
            src={`${TMDB_IMG}/w92${imagePath}`}
            sizes="64px"
            loading={resolveImageLoading()}
            quality={resolveImageQuality('grid')}
            decoding="async"
            wrapperClassName="h-full w-full"
          />
        ) : (
          <div className={`center h-full w-full text-[#7f1d1d]`}>
            <Icon
              icon={
                item.media_type === SEARCH_TYPES.PERSON ? 'solar:user-bold' : 'solar:gallery-bold'
              }
              size={18}
            />
          </div>
        )}
      </div>
      <div className="mr-2.5 flex min-w-0 flex-1 flex-col justify-center gap-1.5">
        <span className="truncate leading-tight font-bold uppercase">{title}</span>
        <div className="flex items-center gap-2">
          {year && (
            <div className={SEARCH_STYLES.metaBadge}>
              <span className="px-2 py-1 text-[10px] font-bold tracking-tight text-white/70">
                {year}
              </span>
            </div>
          )}
          {director && (
            <div className={SEARCH_STYLES.metaBadge}>
              <span className="px-2 py-1 text-[10px] font-bold tracking-tight text-white/70">
                {director}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
  if (!hasDetailPath) {
    return <div className={SEARCH_STYLES.resultItem}>{rowContent}</div>;
  }
  return (
    <Link
      href={detailPath}
      className={SEARCH_STYLES.resultItem}
      onClick={(event) => {
        if (event.button === 0 && !event.ctrlKey && !event.metaKey) {
          onSelect?.(item);
        }
      }}
    >
      {rowContent}
    </Link>
  );
}

export function SearchActionResultsPreview({
  imageErrors = {},
  query = '',
  searchType = 'all',
  currentPage = 0,
  results = [],
  resultSetId = 0,
  onImageError,
  onSelect,
}) {
  const hasQuery = Boolean(query.trim());
  const hasResults = results.length > 0;
  const resultListKey = `${resultSetId}:${query}:${searchType}:${currentPage}`;

  return (
    <AnimatePresence mode="wait" initial={false}>
      {hasQuery && hasResults ? (
        <motion.div
          key={resultListKey}
          className="mt-2 flex flex-col gap-1 overflow-hidden"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6, transition: NAV_RESULTS_EXIT_TRANSITION }}
          transition={NAV_RESULTS_TRANSITION}
        >
          {results.map((item, index) => (
            <motion.div
              key={`${item.media_type}-${item.id}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4, transition: NAV_RESULTS_EXIT_TRANSITION }}
              transition={{
                ...NAV_RESULTS_TRANSITION,
                delay: 0.04 + index * NAV_RESULTS_STAGGER_DELAY,
              }}
            >
              <SearchResultItem
                item={item}
                imageErrors={imageErrors}
                onImageError={onImageError}
                onSelect={onSelect}
              />
            </motion.div>
          ))}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function SearchActionControls({
  loading = false,
  query = '',
  searchType,
  ariaLabel = 'Search',
  placeholder = 'Search movies, TV series, people or users',
  tabItems = SEARCH_TAB_ITEMS,
  showTabs = true,
  showTabsWhenEmpty = false,
  hasPrevPage = false,
  hasNextPage = false,
  onClear,
  onQueryChange,
  onSearchTypeChange,
  onPrevPage,
  onNextPage,
}) {
  const shouldShowTabs = showTabs && (showTabsWhenEmpty || Boolean(query.trim()));
  const [isActive, setIsActive] = useState(false);
  return (
    <>
      <div className="flex w-full items-center">
        {hasPrevPage && <PaginationArrow direction="left" onClick={onPrevPage} />}
        <div className="min-w-0 flex-1">
          <Input
            aria-label={ariaLabel}
            value={query}
            onFocus={() => setIsActive(true)}
            onBlur={() => setIsActive(false)}
            classNames={{
              input: 'w-full text-sm placeholder:text-white/50 outline-none',
              wrapper: navActionClass({
                cn,
                button: SEARCH_STYLES.input,
                isActive,
              }),
              leftIcon: 'mr-2 center shrink-0',
            }}
            enterKeyHint="search"
            leftIcon={
              <Icon
                className={`${query ? 'text-white' : 'text-white/50'}`}
                icon="solar:magnifer-linear"
                size={16}
              />
            }
            placeholder={placeholder}
            type="text"
            spellCheck={false}
            onChange={(event) => onQueryChange?.(event.target.value)}
            rightIcon={
              loading ? (
                <div className="center shrink-0">
                  <Icon icon="line-md:loading-loop" size={16} />
                </div>
              ) : query ? (
                <button
                  type="button"
                  className="center text-error shrink-0 cursor-pointer"
                  onClick={onClear}
                >
                  <Icon icon="material-symbols:close-rounded" size={16} />
                </button>
              ) : null
            }
          />
        </div>
        {hasNextPage && <PaginationArrow direction="right" onClick={onNextPage} />}
      </div>

      <AnimatePresence initial={false}>
        {shouldShowTabs ? (
          <motion.div
            className="mt-2 overflow-hidden"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={NAV_FADE_TRANSITION}
          >
            <div className={SEARCH_STYLES.tabList}>
              {tabItems.map((item) => {
                const isActiveTab = searchType === item.key;
                return (
                  <motion.button
                    key={item.key}
                    type="button"
                    className={navActionClass({
                      cn,
                      button: SEARCH_STYLES.tabButton,
                      isActive: isActiveTab,
                    })}
                    onClick={() => onSearchTypeChange?.(item.key)}
                    whileTap={{ scale: NAV_TAP_SCALE }}
                    transition={NAV_BUTTON_TRANSITION}
                  >
                    {item.label}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

async function resolveSearchActionResults({ isManualTab, query, searchType }) {
  const normalizedQuery = query.trim().toLowerCase();
  let nextSearchType = isManualTab ? searchType : SEARCH_TYPES.ALL;
  let userResults = [];
  let mediaResults = [];

  if (!isManualTab) {
    [userResults, mediaResults] = await Promise.all([
      fetchUsers(query),
      fetchAllMedia(query, 1, { scope: 'full' }),
    ]);

    nextSearchType = inferSearchType({
      normalizedQuery,
      userResults,
      mediaResults,
    });
  }

  if (nextSearchType === SEARCH_TYPES.USER) {
    const resolvedUserResults = userResults.length ? userResults : await fetchUsers(query);

    return {
      nextSearchType,
      results: resolvedUserResults.slice(0, SEARCH_LIMITS.MAX_RESULTS),
    };
  }

  if (nextSearchType === SEARCH_TYPES.ALL) {
    const [resolvedUserResults, resolvedMediaResults] = await Promise.all([
      userResults.length ? userResults : fetchUsers(query),
      mediaResults.length ? mediaResults : fetchAllMedia(query, 1, { scope: 'full' }),
    ]);

    return {
      nextSearchType,
      results: mergeAllResults(resolvedUserResults, resolvedMediaResults),
    };
  }

  const typedMediaResults = await fetchMedia(query, nextSearchType, { scope: 'full' });

  return {
    nextSearchType,
    results: limitMediaResults(typedMediaResults),
  };
}

export function useSearchActionController({
  loading: controlledLoading = false,
  query: controlledQuery,
  searchType: controlledSearchType,
  onQueryChange,
  onSearchTypeChange,
}) {
  const isQueryControlled = typeof controlledQuery === 'string';
  const isSearchTypeControlled = typeof controlledSearchType === 'string';

  const [localQuery, setLocalQuery] = useState('');
  const [localSearchType, setLocalSearchType] = useState(SEARCH_TYPES.ALL);
  const [isManualTab, setIsManualTab] = useState(false);
  const [results, setResults] = useState([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [imageErrors, setImageErrors] = useState({});
  const [currentPage, setCurrentPage] = useState(0);
  const [resultSetId, setResultSetId] = useState(0);

  const query = isQueryControlled ? controlledQuery : localQuery;
  const searchType = isSearchTypeControlled ? controlledSearchType : localSearchType;
  const loading = controlledLoading || localLoading;
  const debouncedQuery = useDebounce(query, 500);
  const { expanded, navigate, setCompactLock, setExpanded } = useNavigation();

  const perPage = SEARCH_LIMITS.RESULTS_PER_PAGE;
  const totalPages = Math.max(1, Math.ceil(results.length / perPage));
  const safePage = Math.min(currentPage, totalPages - 1);
  const pageResults = useMemo(
    () => results.slice(safePage * perPage, safePage * perPage + perPage),
    [results, safePage, perPage],
  );
  const hasPrevPage = safePage > 0;
  const hasNextPage = safePage < totalPages - 1;

  const handleQueryChange = useCallback(
    (nextQuery) => {
      if (!isQueryControlled) {
        setLocalQuery(nextQuery);
      }

      onQueryChange?.(nextQuery);
      setIsManualTab(false);
      setCurrentPage(0);
    },
    [isQueryControlled, onQueryChange],
  );

  const handleSearchTypeChange = useCallback(
    (nextSearchType) => {
      if (!isSearchTypeControlled) {
        setLocalSearchType(nextSearchType);
      }

      onSearchTypeChange?.(nextSearchType);
      setIsManualTab(true);
      setCurrentPage(0);
    },
    [isSearchTypeControlled, onSearchTypeChange],
  );

  const handleClear = useCallback(() => {
    handleQueryChange('');
    setResults([]);
    setCurrentPage(0);
    setResultSetId((previousId) => previousId + 1);

    if (!isSearchTypeControlled) {
      setLocalSearchType(SEARCH_TYPES.ALL);
    }

    setIsManualTab(false);
  }, [handleQueryChange, isSearchTypeControlled]);

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
    [handleClear, navigate, setExpanded],
  );

  const handlePrevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));
  }, [totalPages]);

  useEffect(() => {
    const normalizedDebouncedQuery = debouncedQuery?.trim();

    if (!normalizedDebouncedQuery) {
      setResults([]);
      setCurrentPage(0);
      setResultSetId((previousId) => previousId + 1);

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
        const payload = await resolveSearchActionResults({
          isManualTab,
          query: debouncedQuery,
          searchType,
        });

        if (isCancelled) {
          return;
        }

        startTransition(() => {
          if (!isManualTab && !isSearchTypeControlled) {
            setLocalSearchType(payload.nextSearchType);
          }

          setResults(payload.results);
          setCurrentPage(0);
          setResultSetId((previousId) => previousId + 1);
        });
      } catch {
        if (!isCancelled) {
          startTransition(() => {
            setResults([]);
            setCurrentPage(0);
            setResultSetId((previousId) => previousId + 1);
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
  }, [debouncedQuery, isManualTab, isSearchTypeControlled, searchType]);

  useEffect(() => {
    if (!expanded) {
      handleClear();
    }
  }, [expanded, handleClear]);

  useEffect(() => {
    const shouldLockCompact = Boolean(query.trim() || loading || results.length > 0);
    setCompactLock('search-action', shouldLockCompact);

    return () => {
      setCompactLock('search-action', false);
    };
  }, [loading, query, results.length, setCompactLock]);

  return {
    currentPage: safePage,
    debouncedQuery,
    handleClear,
    handleImageError,
    handleNextPage,
    handlePrevPage,
    handleQueryChange,
    handleSearchTypeChange,
    handleSelect,
    hasNextPage,
    hasPrevPage,
    imageErrors,
    loading,
    pageResults,
    query,
    results,
    resultSetId,
    searchType,
    totalPages,
  };
}

export default function SearchAction({
  loading: controlledLoading = false,
  query: controlledQuery,
  searchType: controlledSearchType,
  onQueryChange,
  onSearchTypeChange,
}) {
  const {
    currentPage,
    debouncedQuery,
    handleClear,
    handleImageError,
    handleNextPage,
    handlePrevPage,
    handleQueryChange,
    handleSearchTypeChange,
    handleSelect,
    hasNextPage,
    hasPrevPage,
    imageErrors,
    loading,
    pageResults,
    query,
    resultSetId,
    results,
    searchType,
    totalPages,
  } = useSearchActionController({
    loading: controlledLoading,
    onQueryChange,
    onSearchTypeChange,
    query: controlledQuery,
    searchType: controlledSearchType,
  });
  return (
    <div className="mt-2.5 w-full">
      <SearchActionControls
        loading={loading}
        query={query}
        searchType={searchType}
        hasPrevPage={hasPrevPage}
        hasNextPage={hasNextPage}
        onClear={handleClear}
        onQueryChange={handleQueryChange}
        onSearchTypeChange={handleSearchTypeChange}
        onPrevPage={handlePrevPage}
        onNextPage={handleNextPage}
      />
      <SearchActionResultsPreview
        imageErrors={imageErrors}
        query={debouncedQuery}
        searchType={searchType}
        results={pageResults}
        resultSetId={resultSetId}
        currentPage={currentPage}
        totalPages={totalPages}
        onImageError={handleImageError}
        onSelect={handleSelect}
      />
    </div>
  );
}

export {
  SearchActionControls as Controls,
  SearchActionResultsPreview as ResultsPreview,
  SearchResultItem as Item,
  SearchAction,
};
