// watchlist.js
'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import {
  MEDIA_FILTER_QUERY_KEYS, applyMediaFilters, buildCollectionBasePath, buildManagedQueryString,
  buildMediaKeySet, collectMediaGenreOptions, getDecadeOptions, hasActiveMediaFilters,
  parseMediaFilters, parsePageFromSearch, toMediaQueryValues,
} from '@/features/account/filtering';
import { AccountMediaFilterBar } from '@/features/account/filters/content-filter-primitives';
import AccountMediaGridPage, { ProfileMediaActions } from '@/features/account/components/media-grid';
import { AccountSectionState } from '@/features/account/components/section-wrapper';

const VISIBILITY_OPTIONS = Object.freeze([
  Object.freeze({ key: 'hide_unreleased', label: 'Hide unreleased titles' }),
  Object.freeze({ key: 'hide_documentaries', label: 'Hide documentaries' }),
]);

const ALLOWED_FLAGS = VISIBILITY_OPTIONS.map((o) => o.key);
const parseCurrentFilters = (search) => parseMediaFilters(search, { allowedEyeFlags: ALLOWED_FLAGS });

export default function AccountWatchlistFeed({ auth, canShowWatchlistGrid, isOwner, loadError, watchlist, onRemoveItem }) {
  const pathname = usePathname();
  const searchString = useSearchParams()?.toString?.() || '';
  const collectionRootPath = buildCollectionBasePath(pathname);

  // State Consolidation
  const [viewState, setViewState] = useState({
    media: parseCurrentFilters(new URLSearchParams(searchString)),
    page: parsePageFromSearch(new URLSearchParams(searchString))
  });

  useEffect(() => {
    setViewState({ media: parseCurrentFilters(new URLSearchParams(searchString)), page: parsePageFromSearch(new URLSearchParams(searchString)) });
  }, [searchString]);

  const updateView = (updates) => {
    setViewState((prev) => {
      const next = { ...prev, ...updates };
      if (typeof window !== 'undefined') {
        const qs = buildManagedQueryString(new URLSearchParams(window.location.search), { managedKeys: MEDIA_FILTER_QUERY_KEYS, resetPage: false, values: toMediaQueryValues(next.media) });
        const params = new URLSearchParams(qs);
        if (next.page > 1) params.set('page', String(next.page)); else params.delete('page');
        window.history.replaceState({}, '', params.toString() ? `${collectionRootPath}?${params.toString()}` : collectionRootPath);
      }
      return next;
    });
  };

  const hasFilters = hasActiveMediaFilters(viewState.media);
  const filteredWatchlistItems = useMemo(
    () => applyMediaFilters(watchlist, viewState.media, { watchlistKeys: buildMediaKeySet(watchlist) }),
    [viewState.media, watchlist]
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
      renderOverlay={(item) => isOwner ? (
        <ProfileMediaActions media={item} onRemoveItem={onRemoveItem} removeLabel={`Remove ${item.title || item.name} from watchlist`} userId={auth.user?.id} />
      ) : null}
      toolbar={
        <AccountMediaFilterBar
          filters={viewState.media}
          decadeOptions={getDecadeOptions()}
          genreOptions={useMemo(() => collectMediaGenreOptions(watchlist), [watchlist])}
          visibilityOptions={VISIBILITY_OPTIONS}
          onChange={(media) => updateView({ media: { ...viewState.media, ...media }, page: 1 })}
          onReset={(watchlist.length > 0 && hasFilters) || hasFilters ? () => updateView({ media: parseCurrentFilters(new URLSearchParams()), page: 1 }) : null}
        />
      }
      title="Watchlist"
    />
  );
}
