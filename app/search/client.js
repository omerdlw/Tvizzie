'use client';

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { getAllMediaGenreOptions, getDecadeOptions } from '@/features/account/filtering';
import { SearchMovieFilterBar } from '@/features/account/shared/content-filters';
import NavHeightSpacer from '@/features/app-shell/nav-height-spacer';
import SearchAction from '@/features/navigation/actions/search-action';
import { SEARCH_GRID, SEARCH_LIMITS, SEARCH_TAB_ITEMS, SEARCH_TYPES } from '@/features/search/constants';
import SearchGridItem from '@/features/search/grid-item';
import {
  applySearchMovieFilters,
  fetchAllMedia,
  fetchMediaPage,
  fetchUsers,
  hasActiveSearchMovieFilters,
  mergeAllResults,
  normalizeSearchMovieFilters,
} from '@/features/search/utils';
import { useDebounce } from '@/core/hooks/use-debounce';
import { getNavActionClass } from '@/core/modules/nav/actions/styles';
import { useRegistry } from '@/core/modules/registry';
import { SEARCH_ROUTE_MOTION, SearchSectionReveal, getSearchGridItemMotion } from './motion';

const DEFAULT_SEARCH_MOVIE_FILTERS = Object.freeze({
  decade: 'all',
  genre: 'all',
  year: 'all',
});

function resolveSearchType(value) {
  if (value === SEARCH_TYPES.MOVIE || value === SEARCH_TYPES.PERSON || value === SEARCH_TYPES.USER) {
    return value;
  }

  return SEARCH_TYPES.ALL;
}

function dedupeResults(items = []) {
  const seen = new Set();
  const deduped = [];

  items.forEach((item) => {
    const key = `${item?.media_type || 'unknown'}-${item?.id || 'unknown'}`;

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    deduped.push(item);
  });

  return deduped;
}

function getSearchGridBatchSize(width) {
  if (width >= SEARCH_GRID.DESKTOP_BREAKPOINT) {
    return SEARCH_GRID.DESKTOP_COLUMNS * SEARCH_GRID.DESKTOP_ROWS;
  }

  return SEARCH_GRID.MOBILE_COLUMNS * SEARCH_GRID.MOBILE_ROWS;
}

function parseSearchMovieFilters(searchParams) {
  return normalizeSearchMovieFilters({
    decade: searchParams?.get('decade'),
    genre: searchParams?.get('genre'),
    year: searchParams?.get('year'),
  });
}

function getReleaseYearOptions(minYear = 1900) {
  const currentYear = new Date().getUTCFullYear();
  const options = [];

  for (let year = currentYear; year >= minYear; year -= 1) {
    options.push({
      label: String(year),
      value: String(year),
    });
  }

  return [{ label: 'Any year', value: 'all' }, ...options];
}

function applySearchMovieFilterParams(params, filters) {
  const normalizedFilters = normalizeSearchMovieFilters(filters);

  if (normalizedFilters.genre !== DEFAULT_SEARCH_MOVIE_FILTERS.genre) {
    params.set('genre', normalizedFilters.genre);
  } else {
    params.delete('genre');
  }

  if (normalizedFilters.decade !== DEFAULT_SEARCH_MOVIE_FILTERS.decade) {
    params.set('decade', normalizedFilters.decade);
  } else {
    params.delete('decade');
  }

  if (normalizedFilters.year !== DEFAULT_SEARCH_MOVIE_FILTERS.year) {
    params.set('year', normalizedFilters.year);
  } else {
    params.delete('year');
  }
}

function areMovieFiltersEqual(left, right) {
  return left?.genre === right?.genre && left?.decade === right?.decade && left?.year === right?.year;
}

function getMovieFiltersKey(filters) {
  const normalizedFilters = normalizeSearchMovieFilters(filters);
  return `${normalizedFilters.genre}|${normalizedFilters.decade}|${normalizedFilters.year}`;
}

function buildSearchHref({ pathname, query, searchParamsString, searchType, movieFilters }) {
  const params = new URLSearchParams(searchParamsString);
  const normalizedQuery = query.trim();
  const normalizedMovieFilters = normalizeSearchMovieFilters(movieFilters);
  const nextSearchType =
    searchType === SEARCH_TYPES.ALL && hasActiveSearchMovieFilters(normalizedMovieFilters)
      ? SEARCH_TYPES.MOVIE
      : searchType;

  if (normalizedQuery) {
    params.set('q', normalizedQuery);
  } else {
    params.delete('q');
  }

  if (normalizedQuery && nextSearchType !== SEARCH_TYPES.ALL) {
    params.set('type', nextSearchType);
  } else {
    params.delete('type');
  }

  applySearchMovieFilterParams(params, normalizedMovieFilters);

  const nextQueryString = params.toString();

  return nextQueryString ? `${pathname}?${nextQueryString}` : pathname;
}

export default function SearchClient() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams?.toString() || '';
  const searchParamQuery = String(searchParams?.get('q') || '').trim();
  const searchParamType = resolveSearchType(String(searchParams?.get('type') || '').toLowerCase());
  const searchParamMovieFilters = useMemo(
    () => parseSearchMovieFilters(new URLSearchParams(searchParamsString)),
    [searchParamsString]
  );
  const searchParamMovieFiltersKey = useMemo(
    () => getMovieFiltersKey(searchParamMovieFilters),
    [searchParamMovieFilters]
  );
  const initialBatchSize =
    typeof window === 'undefined'
      ? SEARCH_GRID.DESKTOP_COLUMNS * SEARCH_GRID.DESKTOP_ROWS
      : getSearchGridBatchSize(window.innerWidth);

  const [query, setQuery] = useState(searchParamQuery);
  const [searchType, setSearchType] = useState(searchParamType);
  const [movieFilters, setMovieFilters] = useState(searchParamMovieFilters);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [visibleCount, setVisibleCount] = useState(initialBatchSize);
  const [pageState, setPageState] = useState({
    page: 1,
    totalPages: 0,
    totalResults: 0,
  });

  const gridBatchSizeRef = useRef(initialBatchSize);
  const debouncedQuery = useDebounce(query, 500);
  const trimmedQuery = query.trim();
  const trimmedDebouncedQuery = debouncedQuery.trim();
  const genreOptions = useMemo(() => getAllMediaGenreOptions(), []);
  const decadeOptions = useMemo(() => getDecadeOptions(), []);
  const yearOptions = useMemo(() => getReleaseYearOptions(), []);
  const activeTypeLabel = SEARCH_TAB_ITEMS.find((item) => item.key === searchType)?.label || 'Results';
  const isMediaType = searchType === SEARCH_TYPES.MOVIE || searchType === SEARCH_TYPES.PERSON;
  const hasMore = isMediaType && pageState.page < pageState.totalPages;
  const hasActiveMovieFilters = useMemo(() => hasActiveSearchMovieFilters(movieFilters), [movieFilters]);
  const getRenderableResults = useCallback(
    (items = []) => {
      return searchType === SEARCH_TYPES.MOVIE ? applySearchMovieFilters(items, movieFilters) : items;
    },
    [movieFilters, searchType]
  );
  const filteredResults = useMemo(() => getRenderableResults(results), [getRenderableResults, results]);
  const canLoadMore = Boolean(trimmedQuery) && (visibleCount < filteredResults.length || hasMore);
  const visibleResults = useMemo(() => filteredResults.slice(0, visibleCount), [filteredResults, visibleCount]);
  const shouldShowMovieFilters =
    (searchType === SEARCH_TYPES.ALL || searchType === SEARCH_TYPES.MOVIE) && visibleResults.length > 0;

  useEffect(() => {
    function updateGridBatchSize() {
      const nextBatchSize = getSearchGridBatchSize(window.innerWidth);

      gridBatchSizeRef.current = nextBatchSize;
      setVisibleCount((currentValue) => (currentValue < nextBatchSize ? nextBatchSize : currentValue));
    }

    updateGridBatchSize();
    window.addEventListener('resize', updateGridBatchSize);

    return () => {
      window.removeEventListener('resize', updateGridBatchSize);
    };
  }, []);

  useEffect(() => {
    setQuery((currentValue) => (currentValue === searchParamQuery ? currentValue : searchParamQuery));
    setSearchType((currentValue) => (currentValue === searchParamType ? currentValue : searchParamType));
    setMovieFilters((currentValue) =>
      areMovieFiltersEqual(currentValue, searchParamMovieFilters) ? currentValue : searchParamMovieFilters
    );
  }, [searchParamMovieFilters, searchParamMovieFiltersKey, searchParamQuery, searchParamType]);

  useEffect(() => {
    const nextHref = buildSearchHref({
      pathname,
      query: debouncedQuery,
      searchParamsString,
      searchType,
      movieFilters,
    });
    const currentHref = searchParamsString ? `${pathname}?${searchParamsString}` : pathname;

    if (nextHref !== currentHref) {
      router.replace(nextHref, { scroll: false });
    }
  }, [debouncedQuery, movieFilters, pathname, router, searchParamsString, searchType]);

  useEffect(() => {
    if (!trimmedQuery) {
      return;
    }

    setVisibleCount((currentValue) => Math.min(currentValue, filteredResults.length));
  }, [filteredResults.length, trimmedQuery]);

  const handleMovieFiltersChange = useCallback((nextPatch) => {
    let nextFilters = DEFAULT_SEARCH_MOVIE_FILTERS;

    setMovieFilters((currentValue) => {
      nextFilters = normalizeSearchMovieFilters({ ...currentValue, ...(nextPatch || {}) });
      return nextFilters;
    });

    setSearchType((currentValue) => {
      if (currentValue !== SEARCH_TYPES.ALL) {
        return currentValue;
      }

      return hasActiveSearchMovieFilters(nextFilters) ? SEARCH_TYPES.MOVIE : currentValue;
    });
  }, []);

  const handleMovieFiltersReset = useCallback(() => {
    setMovieFilters(DEFAULT_SEARCH_MOVIE_FILTERS);
  }, []);

  const handleLoadMore = useCallback(async () => {
    const nextVisibleCount = visibleCount + gridBatchSizeRef.current;

    if (visibleCount < filteredResults.length) {
      setVisibleCount(Math.min(nextVisibleCount, filteredResults.length));
      return;
    }

    if (!trimmedDebouncedQuery || !isMediaType || loading || loadingMore || !hasMore) {
      return;
    }

    setLoadingMore(true);

    try {
      let mergedResults = results;
      let nextPage = pageState.page;
      let totalPages = pageState.totalPages;
      let totalResults = pageState.totalResults;
      let renderableResults = getRenderableResults(mergedResults);

      while (renderableResults.length < nextVisibleCount && nextPage < totalPages) {
        const payload = await fetchMediaPage(trimmedDebouncedQuery, searchType, nextPage + 1, {
          scope: 'full',
        });

        nextPage = payload.page || nextPage + 1;
        totalPages = payload.totalPages || totalPages;
        totalResults = payload.totalResults || totalResults;
        mergedResults = dedupeResults([...mergedResults, ...payload.results]);
        renderableResults = getRenderableResults(mergedResults);

        if (!payload.results.length) {
          break;
        }
      }

      startTransition(() => {
        setResults(mergedResults);
        setPageState({
          page: nextPage,
          totalPages,
          totalResults,
        });
        setVisibleCount(Math.min(nextVisibleCount, renderableResults.length));
      });
    } catch {
      // Keep the current grid when loading the next batch fails.
    } finally {
      setLoadingMore(false);
    }
  }, [
    filteredResults.length,
    getRenderableResults,
    hasMore,
    isMediaType,
    loading,
    loadingMore,
    pageState.page,
    pageState.totalPages,
    pageState.totalResults,
    results,
    searchType,
    trimmedDebouncedQuery,
    visibleCount,
  ]);

  const navAction = useMemo(
    () => (
      <SearchAction
        variant="page"
        loading={loading}
        query={query}
        searchType={searchType}
        onQueryChange={setQuery}
        onSearchTypeChange={setSearchType}
      />
    ),
    [loading, query, searchType]
  );

  useRegistry({
    nav: {
      title: 'Search',
      description: trimmedQuery
        ? `${activeTypeLabel} results for "${trimmedQuery}"`
        : 'Search movies, people, and users',
      icon: 'solar:magnifer-linear',
      action: navAction,
    },
  });

  useEffect(() => {
    if (!trimmedDebouncedQuery) {
      setResults([]);
      setLoading(false);
      setLoadingMore(false);
      setVisibleCount(gridBatchSizeRef.current);
      setPageState({
        page: 1,
        totalPages: 0,
        totalResults: 0,
      });
      return;
    }

    let isCancelled = false;

    async function runSearch() {
      setLoading(true);
      setLoadingMore(false);

      try {
        if (searchType === SEARCH_TYPES.USER) {
          const userResults = await fetchUsers(trimmedDebouncedQuery, SEARCH_LIMITS.USER_FULL_RESULTS);

          if (!isCancelled) {
            startTransition(() => {
              setResults(userResults);
              setVisibleCount(Math.min(gridBatchSizeRef.current, getRenderableResults(userResults).length));
              setPageState({
                page: 1,
                totalPages: 1,
                totalResults: userResults.length,
              });
            });
          }

          return;
        }

        if (searchType === SEARCH_TYPES.ALL) {
          const [userResults, mediaResults] = await Promise.all([
            fetchUsers(trimmedDebouncedQuery, SEARCH_LIMITS.USER_FULL_RESULTS),
            fetchAllMedia(trimmedDebouncedQuery, 1, { scope: 'full' }),
          ]);

          const mergedResults = mergeAllResults(userResults, mediaResults, null);

          if (!isCancelled) {
            const renderableResults = getRenderableResults(mergedResults);

            startTransition(() => {
              setResults(mergedResults);
              setVisibleCount(Math.min(gridBatchSizeRef.current, renderableResults.length));
              setPageState({
                page: 1,
                totalPages: 1,
                totalResults: mergedResults.length,
              });
            });
          }

          return;
        }

        const minimumCount = gridBatchSizeRef.current;
        let payload = await fetchMediaPage(trimmedDebouncedQuery, searchType, 1, { scope: 'full' });
        let mergedResults = payload.results;
        let currentPage = payload.page || 1;
        let totalPages = payload.totalPages || 0;
        let totalResults = payload.totalResults || payload.results.length;

        while (!isCancelled && getRenderableResults(mergedResults).length < minimumCount && currentPage < totalPages) {
          payload = await fetchMediaPage(trimmedDebouncedQuery, searchType, currentPage + 1, {
            scope: 'full',
          });
          currentPage = payload.page || currentPage + 1;
          totalPages = payload.totalPages || totalPages;
          totalResults = payload.totalResults || totalResults;
          mergedResults = dedupeResults([...mergedResults, ...payload.results]);

          if (!payload.results.length) {
            break;
          }
        }

        if (!isCancelled) {
          const renderableResults = getRenderableResults(mergedResults);

          startTransition(() => {
            setResults(mergedResults);
            setVisibleCount(Math.min(minimumCount, renderableResults.length));
            setPageState({
              page: currentPage,
              totalPages,
              totalResults,
            });
          });
        }
      } catch {
        if (!isCancelled) {
          startTransition(() => {
            setResults([]);
            setVisibleCount(gridBatchSizeRef.current);
            setPageState({
              page: 1,
              totalPages: 0,
              totalResults: 0,
            });
          });
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    void runSearch();

    return () => {
      isCancelled = true;
    };
  }, [getRenderableResults, searchType, trimmedDebouncedQuery]);

  return (
    <>
      <section className="mx-auto w-full max-w-[1680px] px-4 pt-6 md:px-6 lg:px-8">
        {shouldShowMovieFilters ? (
          <SearchSectionReveal delay={SEARCH_ROUTE_MOTION.orchestration.filterDelay}>
            <SearchMovieFilterBar
              className="mb-5"
              decadeOptions={decadeOptions}
              filters={movieFilters}
              genreOptions={genreOptions}
              onChange={handleMovieFiltersChange}
              onReset={hasActiveMovieFilters ? handleMovieFiltersReset : undefined}
              yearOptions={yearOptions}
            />
          </SearchSectionReveal>
        ) : null}

        {trimmedQuery ? (
          <SearchSectionReveal delay={SEARCH_ROUTE_MOTION.orchestration.resultDelay}>
            <div>
              {visibleResults.length > 0 ? (
                <>
                  <div className="grid grid-cols-4 gap-3 lg:grid-cols-8">
                    {visibleResults.map((item, index) => {
                      const itemMotion = getSearchGridItemMotion({ index });

                      return (
                        <motion.div
                          key={`${item.media_type}-${item.id}`}
                          initial={itemMotion.initial}
                          animate={itemMotion.animate}
                          transition={itemMotion.transition}
                        >
                          <SearchGridItem item={item} />
                        </motion.div>
                      );
                    })}
                  </div>

                  {canLoadMore ? (
                    <div className="mt-6 flex justify-center">
                      <button
                        type="button"
                        className={getNavActionClass({
                          className: 'min-w-[220px] px-5',
                          isActive: false,
                        })}
                        disabled={loadingMore}
                        onClick={handleLoadMore}
                      >
                        {loadingMore ? 'Loading' : 'Load more results'}
                      </button>
                    </div>
                  ) : null}
                </>
              ) : loading ? null : (
                <div className="mx-auto w-full max-w-4xl border border-white/10 bg-white/10 px-4 py-3 text-xs font-medium text-white/70">
                  {hasActiveMovieFilters && searchType === SEARCH_TYPES.MOVIE
                    ? 'No results found for the selected movie filters'
                    : 'No results found'}
                </div>
              )}
            </div>
          </SearchSectionReveal>
        ) : (
          <div className="mx-auto w-full max-w-4xl rounded-xs border-[0.5px] border-white/10 bg-white/5 px-4 py-3 text-xs font-medium text-white/70">
            Start typing to see all results
          </div>
        )}
      </section>
      <NavHeightSpacer />
    </>
  );
}
