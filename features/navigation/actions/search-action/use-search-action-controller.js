'use client';

import { startTransition, useCallback, useEffect, useState } from 'react';

import { useDebounce } from '@/core/hooks/use-debounce';
import { useNavigation } from '@/core/modules/nav/hooks';
import { SEARCH_LIMITS, SEARCH_TYPES } from '@/features/search/constants';
import {
  fetchAllMedia,
  fetchMedia,
  fetchUsers,
  getDetailPath,
  inferSearchType,
  limitMediaResults,
  mergeAllResults,
} from '@/features/search/utils';

import { SEARCH_ACTION_VARIANTS } from './constants';

async function resolveSearchActionResults({ isManualTab, query, searchType }) {
  const normalizedQuery = query.trim().toLowerCase();
  let nextSearchType = isManualTab ? searchType : SEARCH_TYPES.ALL;
  let userResults = [];
  let mediaResults = [];

  if (!isManualTab) {
    [userResults, mediaResults] = await Promise.all([fetchUsers(query), fetchAllMedia(query)]);

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
      mediaResults.length ? mediaResults : fetchAllMedia(query),
    ]);

    return {
      nextSearchType,
      results: mergeAllResults(resolvedUserResults, resolvedMediaResults),
    };
  }

  const typedMediaResults = await fetchMedia(query, nextSearchType);

  return {
    nextSearchType,
    results: limitMediaResults(typedMediaResults),
  };
}

export function useSearchActionController({
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

    const normalizedDebouncedQuery = debouncedQuery?.trim();

    if (!normalizedDebouncedQuery) {
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
        });
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

  return {
    handleClear,
    handleImageError,
    handleQueryChange,
    handleSearchTypeChange,
    handleSeeAllResults,
    handleSelect,
    imageErrors,
    isPageVariant,
    loading,
    query,
    results,
    searchType,
  };
}
