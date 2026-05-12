'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { usePathname, useSearchParams } from 'next/navigation';

import {
  applyMediaFilters,
  buildMediaKeySet,
} from '@/features/account/filters/media/apply';
import { MEDIA_FILTER_QUERY_KEYS } from '@/features/account/filters/media/options';
import {
  collectMediaGenreOptions,
  getDecadeOptions,
} from '@/features/account/filters/media/option-resolvers';
import {
  hasActiveMediaFilters,
  parseMediaFilters,
  toMediaQueryValues,
} from '@/features/account/filters/media/query';
import { buildCollectionBasePath, buildManagedQueryString, parsePageFromSearch } from '@/features/account/filters/query-utils';
import AccountMediaFilterBar from '@/features/account/filters/media/bar';
import AccountMediaGridPage, { ProfileMediaActions } from '@/features/account/components/media-grid';
import { AccountSectionState } from '@/features/account/components/section-wrapper';

const WATCHED_VISIBILITY_OPTIONS = Object.freeze([
  Object.freeze({ key: 'hide_rewatched', label: 'Hide rewatched films' }),
  Object.freeze({ key: 'hide_unreleased', label: 'Hide unreleased titles' }),
  Object.freeze({ key: 'hide_documentaries', label: 'Hide documentaries' }),
]);
const WATCHED_ALLOWED_EYE_FLAGS = WATCHED_VISIBILITY_OPTIONS.map((option) => option.key);

function parseWatchedMediaFilters(search) {
  return parseMediaFilters(search, {
    allowedEyeFlags: WATCHED_ALLOWED_EYE_FLAGS,
  });
}

export default function AccountWatchedFeed({
  auth,
  canShowWatchedGrid,
  isOwner,
  loadError,
  watchedItems,
  onRemoveItem,
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams?.toString?.() || '';
  const initialMediaFilters = useMemo(
    () => parseWatchedMediaFilters(new URLSearchParams(searchParamsKey)),
    [searchParamsKey]
  );
  const initialPage = useMemo(() => parsePageFromSearch(new URLSearchParams(searchParamsKey)), [searchParamsKey]);
  const [mediaFilters, setMediaFilters] = useState(initialMediaFilters);
  const [activePage, setActivePage] = useState(initialPage);
  const collectionRootPath = useMemo(() => buildCollectionBasePath(pathname), [pathname]);
  const currentUserId = auth.user?.id || null;
  const decadeOptions = useMemo(() => getDecadeOptions(), []);
  const genreOptions = useMemo(() => collectMediaGenreOptions(watchedItems), [watchedItems]);
  const watchedKeys = useMemo(() => buildMediaKeySet(watchedItems), [watchedItems]);
  const filteredWatchedItems = useMemo(
    () => applyMediaFilters(watchedItems, mediaFilters, { watchedKeys }),
    [mediaFilters, watchedItems, watchedKeys]
  );
  const hasFilters = hasActiveMediaFilters(mediaFilters);
  useEffect(() => {
    setMediaFilters(initialMediaFilters);
    setActivePage(initialPage);
  }, [initialMediaFilters, initialPage]);

  const updateUrl = useCallback(
    (nextFilters, nextPage) => {
      if (typeof window === 'undefined') {
        return;
      }

      const queryString = buildManagedQueryString(new URLSearchParams(window.location.search), {
        managedKeys: MEDIA_FILTER_QUERY_KEYS,
        resetPage: false,
        values: toMediaQueryValues(nextFilters),
      });
      const params = new URLSearchParams(queryString);

      if (nextPage > 1) {
        params.set('page', String(nextPage));
      } else {
        params.delete('page');
      }

      const nextQuery = params.toString();
      window.history.replaceState({}, '', nextQuery ? `${collectionRootPath}?${nextQuery}` : collectionRootPath);
    },
    [collectionRootPath]
  );

  const updateFilters = useCallback(
    (updates = {}) => {
      const nextFilters = {
        ...mediaFilters,
        ...updates,
      };
      setMediaFilters(nextFilters);
      setActivePage(1);
      updateUrl(nextFilters, 1);
    },
    [mediaFilters, updateUrl]
  );

  const handleResetFilters = useCallback(() => {
    const defaultFilters = parseWatchedMediaFilters(new URLSearchParams());

    setMediaFilters(defaultFilters);
    setActivePage(1);
    updateUrl(defaultFilters, 1);
  }, [updateUrl]);

  const handlePageChange = useCallback(
    (nextPage) => {
      setActivePage(nextPage);
      updateUrl(mediaFilters, nextPage);
    },
    [mediaFilters, updateUrl]
  );

  if (!canShowWatchedGrid) {
    return <AccountSectionState message="This profile is private." />;
  }

  if (loadError) {
    return <AccountSectionState message={loadError} />;
  }

  return (
    <AccountMediaGridPage
      currentPage={activePage}
      emptyMessage="No watched films yet"
      icon="solar:eye-bold"
      items={filteredWatchedItems}
      onPageChange={handlePageChange}
      pageBasePath={collectionRootPath}
      showHeader={false}
      renderOverlay={(item) =>
        isOwner ? (
          <ProfileMediaActions
            media={item}
            onRemoveItem={onRemoveItem}
            removeLabel={`Remove ${item.title || item.name} from watched`}
            userId={currentUserId}
          />
        ) : null
      }
      toolbar={
        watchedItems.length > 0 ? (
          <AccountMediaFilterBar
            filters={mediaFilters}
            decadeOptions={decadeOptions}
            genreOptions={genreOptions}
            visibilityOptions={WATCHED_VISIBILITY_OPTIONS}
            onChange={updateFilters}
            onReset={hasFilters ? handleResetFilters : null}
          />
        ) : hasFilters ? (
          <AccountMediaFilterBar
            filters={mediaFilters}
            decadeOptions={decadeOptions}
            genreOptions={genreOptions}
            visibilityOptions={WATCHED_VISIBILITY_OPTIONS}
            onChange={updateFilters}
            onReset={handleResetFilters}
          />
        ) : null
      }
      title="Watched"
    />
  );
}
