'use client';

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { getAllMediaGenreOptions, getDecadeOptions } from '@/features/account/filters/media/option-resolvers';
import SearchAction from '@/features/navigation/actions/search-action';
import { SEARCH_GRID, SEARCH_LIMITS, SEARCH_TAB_ITEMS, SEARCH_TYPES } from '@/features/search/constants';
import { dedupeResults, getSearchGridBatchSize } from './grid-state';
import SearchResultsSection from './results-section';
import {
  DEFAULT_SEARCH_MOVIE_FILTERS,
  areMovieFiltersEqual,
  buildSearchHref,
  getMovieFiltersKey,
  getReleaseYearOptions,
  parseSearchMovieFilters,
  resolveSearchType,
} from './url-state';
import {
  fetchCommunity,
  fetchAllMedia,
  fetchMediaPage,
  fetchUsers,
  mergeAllResults,
} from '@/features/search/client-data';
import {
  applySearchMovieFilters,
  hasActiveSearchMovieFilters,
  normalizeSearchMovieFilters,
} from '@/features/search/movie-filters';
import { useDebounce } from '@/core/hooks/use-debounce';
import { useRegistry } from '@/core/modules/registry';

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
  const isCommunityType = searchType === SEARCH_TYPES.LIST || searchType === SEARCH_TYPES.REVIEW;
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
        : 'Search movies, people, users, lists, and reviews',
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

        if (isCommunityType) {
          const communityResults = await fetchCommunity(
            trimmedDebouncedQuery,
            searchType,
            SEARCH_LIMITS.COMMUNITY_RESULTS
          );

          if (!isCancelled) {
            startTransition(() => {
              setResults(communityResults);
              setVisibleCount(Math.min(gridBatchSizeRef.current, getRenderableResults(communityResults).length));
              setPageState({
                page: 1,
                totalPages: 1,
                totalResults: communityResults.length,
              });
            });
          }

          return;
        }

        if (searchType === SEARCH_TYPES.ALL) {
          const [userResults, communityResults, mediaResults] = await Promise.all([
            fetchUsers(trimmedDebouncedQuery, SEARCH_LIMITS.USER_FULL_RESULTS),
            fetchCommunity(trimmedDebouncedQuery, SEARCH_TYPES.ALL, SEARCH_LIMITS.COMMUNITY_RESULTS),
            fetchAllMedia(trimmedDebouncedQuery, 1, { scope: 'full' }),
          ]);

          const mergedResults = mergeAllResults(userResults, [...mediaResults, ...communityResults], null);

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
  }, [getRenderableResults, isCommunityType, searchType, trimmedDebouncedQuery]);

  return (
    <SearchResultsSection
      canLoadMore={canLoadMore}
      decadeOptions={decadeOptions}
      genreOptions={genreOptions}
      hasActiveMovieFilters={hasActiveMovieFilters}
      loading={loading}
      loadingMore={loadingMore}
      movieFilters={movieFilters}
      onLoadMore={handleLoadMore}
      onMovieFiltersChange={handleMovieFiltersChange}
      onMovieFiltersReset={handleMovieFiltersReset}
      searchType={searchType}
      shouldShowMovieFilters={shouldShowMovieFilters}
      trimmedQuery={trimmedQuery}
      visibleResults={visibleResults}
      yearOptions={yearOptions}
    />
  );
}
