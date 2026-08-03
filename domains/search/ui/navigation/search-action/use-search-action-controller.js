'use client';

import { startTransition, useCallback, useEffect, useMemo, useState } from 'react';

import { useDebounce } from '@/shared/hooks/use-debounce';
import { useNavigation } from '@/modules/nav';
import { SEARCH_LIMITS, SEARCH_TYPES } from '@/domains/search/utils';
import {
  fetchAllMedia,
  fetchMedia,
  fetchUsers,
  getDetailPath,
  inferSearchType,
  limitMediaResults,
  mergeAllResults,
} from '@/domains/search/ui/search-data';

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

  const query = isQueryControlled ? controlledQuery : localQuery;
  const searchType = isSearchTypeControlled ? controlledSearchType : localSearchType;
  const loading = localLoading;
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
        });
      } catch {
        if (!isCancelled) {
          startTransition(() => {
            setResults([]);
            setCurrentPage(0);
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
    searchType,
    totalPages,
  };
}
