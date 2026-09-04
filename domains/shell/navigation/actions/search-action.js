'use client';

import { useState, startTransition, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';

import { TMDB_IMG } from '@/shared';
import {
  applyAvatarFallback,
  getUserAvatarFallbackUrl,
  getUserAvatarUrl,
} from '@/domains/account/client';
import { cn } from '@/ui/class-names';
import { resolveImageLoading, resolveImageQuality } from '@/shared';
import AdaptiveImage from '@/ui/components/adaptive-image';
import Icon from '@/ui/primitives/icon';
import { Button, Input, Tooltip } from '@/ui/primitives';
import { useDebounce } from '@/shared';
import { useNavigation } from '@/modules/nav';
import {
  NAV_BUTTON_TRANSITION,
  NAV_FADE_TRANSITION,
  NAV_RESULTS_EXIT_TRANSITION,
  NAV_RESULTS_STAGGER_DELAY,
  NAV_RESULTS_TRANSITION,
  NAV_TAP_SCALE,
  textCrossfadeVariants,
} from '@/modules/nav';
import { SEARCH_LIMITS, SEARCH_TYPES } from '@/domains/search/utils/constants';
import { SEARCH_STYLES, SEARCH_TAB_ITEMS, getNavActionClass } from './constants';
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
    <Button
      type="button"
      className={cn(
        SEARCH_STYLES.action.muted,
        'center h-[38px] w-[38px] shrink-0 cursor-pointer rounded-[20px] p-0 hover:text-white',
      )}
      onClick={onClick}
      aria-label={isLeft ? 'Previous page' : 'Next page'}
    >
      <Icon
        icon={isLeft ? 'solar:alt-arrow-left-linear' : 'solar:alt-arrow-right-linear'}
        size={16}
        className="text-white/70 hover:text-white"
      />
    </Button>
  );
}

export function SearchResultPosterItem({ item, imageErrors = {}, onImageError, onSelect }) {
  const title = getItemTitle(item);
  const year = getItemYear(item);
  const director = getItemDirector(item);
  const imagePath = getImagePath(item);
  const itemKey = `${item.media_type}-${item.id}`;
  const hasImageError = imageErrors[itemKey];
  const detailPath = getDetailPath(item);
  const isTv = item.media_type === SEARCH_TYPES.TV;
  const typeLabel = isTv ? 'TV' : 'Movie';

  const posterContent = (
    <div className="relative aspect-[2/3] w-full overflow-hidden rounded-[20px] bg-white/5 ring-1 ring-white/5 transition-all duration-300 ease-in-out ring-inset group-hover/poster:ring-white/50">
      {imagePath && !hasImageError ? (
        <AdaptiveImage
          fill
          alt={title}
          className="rounded-[20px] object-cover transition-transform duration-300 ease-out group-hover/poster:scale-105"
          onError={() => onImageError?.(itemKey)}
          src={`${TMDB_IMG}/w342${imagePath}`}
          sizes="(max-width: 640px) 25vw, 120px"
          loading={resolveImageLoading()}
          quality={resolveImageQuality('grid')}
          decoding="async"
          wrapperClassName="h-full w-full rounded-[20px]"
        />
      ) : (
        <div className="center text-error h-full w-full">
          <Icon icon="solar:gallery-bold" size={22} />
        </div>
      )}
    </div>
  );

  const tooltipText = (
    <div className="flex max-w-[200px] flex-col items-center gap-0.5 py-0.5 text-center">
      <span className="text-xs leading-snug font-bold text-black">{title}</span>
      <span className="text-xs font-semibold text-black/80">
        {[year, typeLabel, director].filter(Boolean).join(' • ')}
      </span>
    </div>
  );

  if (!detailPath) {
    return (
      <Tooltip position="top" text={tooltipText}>
        <div className="group/poster cursor-default rounded-[20px]">{posterContent}</div>
      </Tooltip>
    );
  }

  return (
    <Tooltip position="top" text={tooltipText}>
      <Link
        href={detailPath}
        className="group/poster block rounded-[20px] outline-none focus-visible:ring-2 focus-visible:ring-white/15"
        onClick={(event) => {
          if (event.button === 0 && !event.ctrlKey && !event.metaKey) {
            onSelect?.(item);
          }
        }}
      >
        {posterContent}
      </Link>
    </Tooltip>
  );
}

export function SearchResultListItem({ item, imageErrors = {}, onImageError, onSelect }) {
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
    <div className="flex w-full min-w-0 items-center gap-2.5">
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
          <div className="center text-error h-full w-full">
            <Icon
              icon={
                item.media_type === SEARCH_TYPES.PERSON ? 'solar:user-bold' : 'solar:gallery-bold'
              }
              size={18}
            />
          </div>
        )}
      </div>
      <div className="mr-2 flex min-w-0 flex-1 flex-col justify-center gap-1">
        <span className="truncate leading-tight font-bold uppercase">{title}</span>
        <div className="flex items-center gap-2.5">
          {year && (
            <div className={SEARCH_STYLES.metaBadge}>
              <span className="px-2 py-1 text-xs font-bold text-white/70">{year}</span>
            </div>
          )}
          {director && (
            <div className={SEARCH_STYLES.metaBadge}>
              <span className="px-2 py-1 text-xs font-bold text-white/70">{director}</span>
            </div>
          )}
          {item.media_type === SEARCH_TYPES.PERSON && (
            <div className={SEARCH_STYLES.metaBadge}>
              <span className="px-2 py-1 text-xs font-bold text-white/70 uppercase">Person</span>
            </div>
          )}
          {item.media_type === SEARCH_TYPES.USER && (
            <div className={SEARCH_STYLES.metaBadge}>
              <span className="px-2 py-1 text-xs font-bold text-white/70 uppercase">User</span>
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

export function SearchResultItem({ item, imageErrors = {}, onImageError, onSelect }) {
  const isMedia = item?.media_type === SEARCH_TYPES.MOVIE || item?.media_type === SEARCH_TYPES.TV;
  if (isMedia) {
    return (
      <SearchResultPosterItem
        item={item}
        imageErrors={imageErrors}
        onImageError={onImageError}
        onSelect={onSelect}
      />
    );
  }
  return (
    <SearchResultListItem
      item={item}
      imageErrors={imageErrors}
      onImageError={onImageError}
      onSelect={onSelect}
    />
  );
}

function groupResultsByDisplayMode(results = []) {
  const groups = [];
  let currentGroup = null;

  for (const item of results) {
    const isMedia = item?.media_type === SEARCH_TYPES.MOVIE || item?.media_type === SEARCH_TYPES.TV;
    const mode = isMedia ? 'grid' : 'list';

    if (!currentGroup || currentGroup.mode !== mode) {
      currentGroup = { mode, items: [item] };
      groups.push(currentGroup);
    } else {
      currentGroup.items.push(item);
    }
  }

  return groups;
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
  const groups = useMemo(() => groupResultsByDisplayMode(results), [results]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {hasQuery && hasResults ? (
        <motion.div
          key={resultListKey}
          className="flex flex-col gap-2.5 overflow-visible"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: NAV_RESULTS_EXIT_TRANSITION }}
          transition={NAV_RESULTS_TRANSITION}
        >
          {groups.map((group, groupIndex) => {
            if (group.mode === 'grid') {
              return (
                <div key={`grid-group-${groupIndex}`} className="grid grid-cols-4 gap-2.5">
                  {group.items.map((item, itemIndex) => (
                    <motion.div
                      key={`${item.media_type}-${item.id}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95, transition: NAV_RESULTS_EXIT_TRANSITION }}
                      transition={{
                        ...NAV_RESULTS_TRANSITION,
                        delay: 0.03 + itemIndex * NAV_RESULTS_STAGGER_DELAY,
                      }}
                      className="min-w-0"
                    >
                      <SearchResultPosterItem
                        item={item}
                        imageErrors={imageErrors}
                        onImageError={onImageError}
                        onSelect={onSelect}
                      />
                    </motion.div>
                  ))}
                </div>
              );
            }

            return (
              <div key={`list-group-${groupIndex}`} className="flex flex-col gap-2.5">
                {group.items.map((item, itemIndex) => (
                  <motion.div
                    key={`${item.media_type}-${item.id}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: NAV_RESULTS_EXIT_TRANSITION }}
                    transition={{
                      ...NAV_RESULTS_TRANSITION,
                      delay: 0.03 + itemIndex * NAV_RESULTS_STAGGER_DELAY,
                    }}
                  >
                    <SearchResultListItem
                      item={item}
                      imageErrors={imageErrors}
                      onImageError={onImageError}
                      onSelect={onSelect}
                    />
                  </motion.div>
                ))}
              </div>
            );
          })}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function SearchActionControls({
  loading,
  query,
  searchType,
  hasPrevPage,
  hasNextPage,
  onClear,
  onQueryChange,
  onSearchTypeChange,
  onPrevPage,
  onNextPage,
  autoFocus = true,
  placeholder = 'Search movies, TV shows, and people...',
  ariaLabel = 'Search movies, TV shows, and people',
  tabItems = SEARCH_TAB_ITEMS,
  showTabs = true,
}) {
  const hasQuery = Boolean(query?.trim());
  const shouldShowTabs = showTabs && hasQuery;

  return (
    <>
      <div className="flex w-full items-center gap-2.5">
        {hasPrevPage && <PaginationArrow direction="left" onClick={onPrevPage} />}
        <div className="min-w-0 flex-1">
          <Input
            aria-label={ariaLabel}
            id="nav-search-input"
            name="nav-search-input-query"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-lpignore="true"
            data-form-type="other"
            data-1p-ignore="true"
            autoFocus={autoFocus}
            value={query}
            classNames={{
              wrapper: getNavActionClass({
                cn,
                button: SEARCH_STYLES.input,
                isActive: false,
              }),
              input: 'w-full text-sm placeholder:text-white/50 outline-none',
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
                <Button
                  type="button"
                  className="center text-error shrink-0 cursor-pointer"
                  onClick={onClear}
                >
                  <Icon icon="material-symbols:close-rounded" size={16} />
                </Button>
              ) : null
            }
          />
        </div>
        {hasNextPage && <PaginationArrow direction="right" onClick={onNextPage} />}
      </div>

      <AnimatePresence initial={false}>
        {shouldShowTabs ? (
          <motion.div
            className="overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={NAV_FADE_TRANSITION}
          >
            <div className={SEARCH_STYLES.tabList}>
              {tabItems.map((item) => {
                const isActiveTab = searchType === item.key;
                return (
                  <Button
                    key={item.key}
                    type="button"
                    className={cn(
                      getNavActionClass({
                        cn,
                        button: SEARCH_STYLES.tabButton,
                        isActive: isActiveTab,
                      }),
                      'transition-all duration-300 ease-in-out',
                    )}
                    onClick={() => onSearchTypeChange?.(item.key)}
                  >
                    {item.label}
                  </Button>
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

  const isGridMode =
    searchType === SEARCH_TYPES.MOVIE ||
    searchType === SEARCH_TYPES.TV ||
    (searchType === SEARCH_TYPES.ALL &&
      results.some(
        (item) => item?.media_type === SEARCH_TYPES.MOVIE || item?.media_type === SEARCH_TYPES.TV,
      ));
  const perPage = isGridMode ? SEARCH_LIMITS.GRID_RESULTS_PER_PAGE : SEARCH_LIMITS.RESULTS_PER_PAGE;
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
    <motion.div
      variants={textCrossfadeVariants}
      initial="hidden"
      animate="visible"
      transition={NAV_FADE_TRANSITION}
      className="flex w-full flex-col gap-2.5"
    >
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
    </motion.div>
  );
}

export {
  SearchActionControls as Controls,
  SearchActionResultsPreview as ResultsPreview,
  SearchResultItem as Item,
  SearchResultPosterItem as PosterItem,
  SearchResultListItem as ListItem,
  SearchAction,
};
