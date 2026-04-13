'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { usePathname, useSearchParams } from 'next/navigation';

import {
  MEDIA_FILTER_QUERY_KEYS,
  applyMediaFilters,
  buildCollectionBasePath,
  buildManagedQueryString,
  buildMediaKeySet,
  getDecadeOptions,
  getAllMediaGenreOptions,
  hasActiveMediaFilters,
  parseMediaFilters,
  toMediaQueryValues,
} from '@/features/account/filtering';
import { AccountMediaFilterBar } from '@/features/account/shared/content-filters';
import AccountMediaGridPage, { AccountProfileMediaActions } from '@/features/account/shared/media-grid';
import { AccountSectionState } from '@/features/account/shared/section-wrapper';

const WATCHED_VISIBILITY_OPTIONS = Object.freeze([
  Object.freeze({ key: 'hide_rewatched', label: 'Hide rewatched films' }),
  Object.freeze({ key: 'hide_unreleased', label: 'Hide unreleased titles' }),
  Object.freeze({ key: 'hide_documentaries', label: 'Hide documentaries' }),
]);
const WATCHED_ALLOWED_EYE_FLAGS = WATCHED_VISIBILITY_OPTIONS.map((option) => option.key);

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
    () =>
      parseMediaFilters(new URLSearchParams(searchParamsKey), {
        allowedEyeFlags: WATCHED_ALLOWED_EYE_FLAGS,
      }),
    [searchParamsKey]
  );
  const initialPage = useMemo(() => {
    const parsed = Number(new URLSearchParams(searchParamsKey).get('page') || '1');
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
  }, [searchParamsKey]);
  const [mediaFilters, setMediaFilters] = useState(initialMediaFilters);
  const [activePage, setActivePage] = useState(initialPage);
  const collectionRootPath = useMemo(() => buildCollectionBasePath(pathname), [pathname]);
  const decadeOptions = useMemo(() => getDecadeOptions(), []);
  const genreOptions = useMemo(() => getAllMediaGenreOptions(), []);
  const watchedKeys = useMemo(() => buildMediaKeySet(watchedItems), [watchedItems]);
  const filteredWatchedItems = useMemo(
    () => applyMediaFilters(watchedItems, mediaFilters, { watchedKeys }),
    [mediaFilters, watchedItems, watchedKeys]
  );
  useEffect(() => {
    setMediaFilters(initialMediaFilters);
    setActivePage(initialPage);
  }, [initialMediaFilters, initialPage, searchParamsKey]);

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
    setMediaFilters(
      parseMediaFilters(new URLSearchParams(), {
        allowedEyeFlags: WATCHED_ALLOWED_EYE_FLAGS,
      })
    );
    setActivePage(1);
    updateUrl(
      parseMediaFilters(new URLSearchParams(), {
        allowedEyeFlags: WATCHED_ALLOWED_EYE_FLAGS,
      }),
      1
    );
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
          <AccountProfileMediaActions
            media={item}
            onRemoveItem={onRemoveItem}
            removeLabel={`Remove ${item.title || item.name} from watched`}
            userId={auth.user?.id || null}
          />
        ) : null
      }
      toolbar={
        <AccountMediaFilterBar
          filters={mediaFilters}
          decadeOptions={decadeOptions}
          genreOptions={genreOptions}
          visibilityOptions={WATCHED_VISIBILITY_OPTIONS}
          onChange={updateFilters}
          onReset={hasActiveMediaFilters(mediaFilters) ? handleResetFilters : null}
        />
      }
      title="Watched"
    />
  );
}
