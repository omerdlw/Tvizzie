'use client';

import { startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import NavHeightSpacer from '@/features/layout/nav-height-spacer';
import { useDebounce } from '@/core/hooks';
import { getNavActionClass } from '@/core/modules/nav/actions/styles';
import { cn } from '@/core/utils';
import { useRegistry } from '@/core/modules/registry';
import { Input } from '@/ui/elements';
import Icon from '@/ui/icon';

import { SEARCH_LIMITS, SEARCH_STYLES, SEARCH_TAB_ITEMS, SEARCH_TYPES } from './constants';
import SearchResultItem from './parts/item';
import { fetchAllMedia, fetchMediaPage, fetchUsers, mergeAllResults, navActionClass } from './utils';

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

export default function SearchPage() {
  const searchParams = useSearchParams();
  const searchParamQuery = String(searchParams?.get('q') || '').trim();
  const searchParamType = String(searchParams?.get('type') || '').toLowerCase();
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState(SEARCH_TYPES.ALL);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [imageErrors, setImageErrors] = useState({});
  const [pageState, setPageState] = useState({
    page: 1,
    totalPages: 0,
    totalResults: 0,
  });

  const debouncedQuery = useDebounce(query, 500);
  const trimmedQuery = debouncedQuery.trim();
  const activeTypeLabel = SEARCH_TAB_ITEMS.find((item) => item.key === searchType)?.label || 'Results';
  const isMediaType = searchType === SEARCH_TYPES.MOVIE || searchType === SEARCH_TYPES.PERSON;
  const hasMore = isMediaType && pageState.page < pageState.totalPages;

  const handleLoadMore = useCallback(async () => {
    if (!trimmedQuery || !isMediaType || loading || loadingMore || !hasMore) {
      return;
    }

    const nextPage = pageState.page + 1;
    setLoadingMore(true);

    try {
      const payload = await fetchMediaPage(trimmedQuery, searchType, nextPage);

      startTransition(() => {
        setResults((prev) => dedupeResults([...prev, ...payload.results]));
        setPageState((prev) => ({
          page: payload.page || nextPage,
          totalPages: payload.totalPages || prev.totalPages,
          totalResults: payload.totalResults || prev.totalResults,
        }));
      });
    } catch {
      // Keep current list when loading next page fails.
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, isMediaType, loading, loadingMore, pageState.page, searchType, trimmedQuery]);

  const navAction = useMemo(() => {
    if (!hasMore) {
      return null;
    }

    return (
      <div className="mt-2.5 flex w-full gap-2">
        <button
          type="button"
          className={getNavActionClass({
            className: 'flex-1',
            isActive: false,
          })}
          disabled={loadingMore}
          onClick={handleLoadMore}
        >
          {loadingMore ? 'Loading...' : 'Load more results'}
        </button>
      </div>
    );
  }, [handleLoadMore, hasMore, loadingMore]);

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
    setQuery(searchParamQuery);
    setSearchType(resolveSearchType(searchParamType));
  }, [searchParamQuery, searchParamType]);

  useEffect(() => {
    if (!trimmedQuery) {
      setResults([]);
      setLoading(false);
      setLoadingMore(false);
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
          const userResults = await fetchUsers(trimmedQuery, SEARCH_LIMITS.USER_FULL_RESULTS);

          if (!isCancelled) {
            startTransition(() => {
              setResults(userResults);
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
            fetchUsers(trimmedQuery, SEARCH_LIMITS.USER_FULL_RESULTS),
            fetchAllMedia(trimmedQuery),
          ]);

          const mergedResults = mergeAllResults(userResults, mediaResults, null);

          if (!isCancelled) {
            startTransition(() => {
              setResults(mergedResults);
              setPageState({
                page: 1,
                totalPages: 1,
                totalResults: mergedResults.length,
              });
            });
          }

          return;
        }

        const payload = await fetchMediaPage(trimmedQuery, searchType, 1);

        if (!isCancelled) {
          startTransition(() => {
            setResults(payload.results);
            setPageState({
              page: payload.page || 1,
              totalPages: payload.totalPages || 0,
              totalResults: payload.totalResults || payload.results.length,
            });
          });
        }
      } catch {
        if (!isCancelled) {
          startTransition(() => {
            setResults([]);
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

    runSearch();

    return () => {
      isCancelled = true;
    };
  }, [trimmedQuery, searchType]);

  const handleImageError = (key) => {
    setImageErrors((prev) => ({
      ...prev,
      [key]: true,
    }));
  };

  const summaryLabel = useMemo(() => {
    if (!trimmedQuery) {
      return 'Type to search';
    }

    if (loading) {
      return 'Searching...';
    }

    const totalCount = Number.isFinite(pageState.totalResults) && pageState.totalResults > 0
      ? pageState.totalResults
      : results.length;

    return `${totalCount} ${activeTypeLabel.toLowerCase()} result${totalCount === 1 ? '' : 's'}`;
  }, [activeTypeLabel, loading, pageState.totalResults, results.length, trimmedQuery]);

  return (
    <>
      <section className="mx-auto w-full max-w-3xl px-4 pt-6">
        <Input
          classNames={{
            input: 'w-full placeholder:text-black/60 outline-none',
            wrapper: navActionClass({
              cn,
              button: SEARCH_STYLES.input,
            }),
            leftIcon: 'mr-2 center shrink-0',
          }}
          leftIcon={
            <Icon
              className={`${query ? 'text-black' : 'text-black/60'} transition-colors duration-(--motion-duration-normal)`}
              icon="solar:magnifer-linear"
              size={16}
            />
          }
          placeholder="Search movies, people or users"
          value={query}
          spellCheck={false}
          onChange={(event) => {
            setQuery(event.target.value);
            setImageErrors({});
          }}
          rightIcon={
            loading ? (
              <div className="center shrink-0">
                <Icon icon="line-md:loading-loop" size={16} />
              </div>
            ) : query ? (
              <button
                type="button"
                className={`center text-error shrink-0 cursor-pointer`}
                onClick={() => {
                  setQuery('');
                  setResults([]);
                  setImageErrors({});
                }}
              >
                <Icon icon="material-symbols:close-rounded" size={16} />
              </button>
            ) : null
          }
        />

        <div className="mt-2">
          <div className={SEARCH_STYLES.tabList}>
            {SEARCH_TAB_ITEMS.map((item) => {
              const isActive = searchType === item.key;

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
                    setSearchType(item.key);
                    setImageErrors({});
                  }}
                >
                  <span className="relative">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3">
          <p className="text-[11px] font-semibold tracking-widest text-black/60 uppercase">{summaryLabel}</p>
        </div>

        {trimmedQuery ? (
          <div className="mt-2 flex flex-col gap-1">
            {results.length > 0 ? (
              results.map((item) => (
                <SearchResultItem
                  key={`${item.media_type}-${item.id}`}
                  item={item}
                  imageErrors={imageErrors}
                  onImageError={handleImageError}
                  onSelect={() => {}}
                />
              ))
            ) : loading ? null : (
              <div className="rounded-[12px] border border-black/10 bg-black/[0.03] px-4 py-3 text-xs font-medium text-black/65">
                No results found
              </div>
            )}
          </div>
        ) : (
          <div className="mt-2 rounded-[12px] border border-black/10 bg-black/[0.03] px-4 py-3 text-xs font-medium text-black/65">
            Start typing to see all results
          </div>
        )}

      </section>
      <NavHeightSpacer />
    </>
  );
}
