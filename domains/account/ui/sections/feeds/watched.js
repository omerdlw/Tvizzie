'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import {
  MEDIA_FILTER_QUERY_KEYS,
  applyMediaFilters,
  buildCollectionBasePath,
  buildManagedQueryString,
  buildMediaKeySet,
  collectMediaGenreOptions,
  getDecadeOptions,
  hasActiveMediaFilters,
  parseMediaFilters,
  parsePageFromSearch,
  toMediaQueryValues,
} from '@/domains/account/ui/filters/filtering';
import { AccountMediaFilterBar } from '@/domains/account/ui/filters/content-filter-primitives';
import AccountMediaGridPage, {
  ProfileMediaActions,
} from '@/domains/account/ui/components/account-media-grid';
import { AccountSectionState } from '@/domains/account/ui/sections/account-section';

const VISIBILITY_OPTIONS = Object.freeze([
  Object.freeze({ key: 'hide_rewatched', label: 'Hide rewatched titles' }),
  Object.freeze({ key: 'hide_unreleased', label: 'Hide unreleased titles' }),
  Object.freeze({ key: 'hide_documentaries', label: 'Hide documentaries' }),
]);

const ALLOWED_FLAGS = VISIBILITY_OPTIONS.map((o) => o.key);
const parseCurrentFilters = (search) =>
  parseMediaFilters(search, { allowedEyeFlags: ALLOWED_FLAGS });

export default function AccountWatchedFeed({
  auth,
  canShowWatchedGrid,
  isOwner,
  loadError,
  watchedItems,
  onRemoveItem,
}) {
  const pathname = usePathname();
  const searchString = useSearchParams()?.toString?.() || '';
  const collectionRootPath = buildCollectionBasePath(pathname);

  const [viewState, setViewState] = useState({
    media: parseCurrentFilters(new URLSearchParams(searchString)),
    page: parsePageFromSearch(new URLSearchParams(searchString)),
  });

  useEffect(() => {
    setViewState({
      media: parseCurrentFilters(new URLSearchParams(searchString)),
      page: parsePageFromSearch(new URLSearchParams(searchString)),
    });
  }, [searchString]);

  const updateView = (updates) => {
    setViewState((prev) => ({ ...prev, ...updates }));
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const qs = buildManagedQueryString(new URLSearchParams(window.location.search), {
      managedKeys: MEDIA_FILTER_QUERY_KEYS,
      resetPage: false,
      values: toMediaQueryValues(viewState.media),
    });
    const params = new URLSearchParams(qs);
    if (viewState.page > 1) params.set('page', String(viewState.page));
    else params.delete('page');
    const newUrl = params.toString() ? `${collectionRootPath}?${params.toString()}` : collectionRootPath;
    if (window.location.pathname + window.location.search !== newUrl) {
      window.history.replaceState(
        {},
        '',
        newUrl,
      );
    }
  }, [viewState, collectionRootPath]);

  const hasFilters = hasActiveMediaFilters(viewState.media);
  const filteredWatchedItems = useMemo(
    () =>
      applyMediaFilters(watchedItems, viewState.media, {
        watchedKeys: buildMediaKeySet(watchedItems),
      }),
    [viewState.media, watchedItems],
  );
  const genreOptions = useMemo(() => collectMediaGenreOptions(watchedItems), [watchedItems]);

  if (!canShowWatchedGrid) return <AccountSectionState message="This profile is private." />;
  if (loadError) return <AccountSectionState message={loadError} />;

  return (
    <AccountMediaGridPage
      currentPage={viewState.page}
      emptyMessage="No watched titles yet"
      icon="solar:eye-bold"
      items={filteredWatchedItems}
      onPageChange={(page) => updateView({ page })}
      pageBasePath={collectionRootPath}
      showHeader={false}
      renderOverlay={(item) =>
        isOwner ? (
          <ProfileMediaActions
            media={item}
            onRemoveItem={onRemoveItem}
            removeLabel={`Remove ${item.title || item.name} from watched`}
            userId={auth.user?.id}
          />
        ) : null
      }
      toolbar={
        watchedItems.length > 0 || hasFilters ? (
          <AccountMediaFilterBar
            filters={viewState.media}
            decadeOptions={getDecadeOptions()}
            genreOptions={genreOptions}
            visibilityOptions={VISIBILITY_OPTIONS}
            onChange={(media) => updateView({ media: { ...viewState.media, ...media }, page: 1 })}
            onReset={
              hasFilters
                ? () => updateView({ media: parseCurrentFilters(new URLSearchParams()), page: 1 })
                : null
            }
          />
        ) : null
      }
      title="Watched"
    />
  );
}
