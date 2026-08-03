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
} from '@/domains/account/ui/account-media-grid';
import { AccountSectionState } from '@/domains/account/ui/account-section';

const VISIBILITY_OPTIONS = Object.freeze([
  Object.freeze({ key: 'hide_unreleased', label: 'Hide unreleased titles' }),
  Object.freeze({ key: 'hide_documentaries', label: 'Hide documentaries' }),
]);

const ALLOWED_FLAGS = VISIBILITY_OPTIONS.map((o) => o.key);
const parseCurrentFilters = (search) =>
  parseMediaFilters(search, { allowedEyeFlags: ALLOWED_FLAGS });

export default function AccountWatchlistFeed({
  auth,
  canShowWatchlistGrid,
  isOwner,
  loadError,
  watchlist,
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
  const filteredWatchlistItems = useMemo(
    () =>
      applyMediaFilters(watchlist, viewState.media, { watchlistKeys: buildMediaKeySet(watchlist) }),
    [viewState.media, watchlist],
  );

  if (!canShowWatchlistGrid) return <AccountSectionState message="This profile is private." />;
  if (loadError) return <AccountSectionState message={loadError} />;

  return (
    <AccountMediaGridPage
      currentPage={viewState.page}
      emptyMessage="No watchlist titles yet"
      icon="solar:bookmark-bold"
      items={filteredWatchlistItems}
      onPageChange={(page) => updateView({ page })}
      pageBasePath={collectionRootPath}
      showHeader={false}
      renderOverlay={(item) =>
        isOwner ? (
          <ProfileMediaActions
            media={item}
            onRemoveItem={onRemoveItem}
            removeLabel={`Remove ${item.title || item.name} from watchlist`}
            userId={auth.user?.id}
          />
        ) : null
      }
      toolbar={
        watchlist.length > 0 || hasFilters ? (
          <AccountMediaFilterBar
            filters={viewState.media}
            decadeOptions={getDecadeOptions()}
            genreOptions={useMemo(() => collectMediaGenreOptions(watchlist), [watchlist])}
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
      title="Watchlist"
    />
  );
}
