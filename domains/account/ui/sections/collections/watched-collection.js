'use client';

import { useMemo } from 'react';

import {
  applyMediaFilters,
  buildMediaKeySet,
  collectMediaGenreOptions,
  getDecadeOptions,
  hasActiveMediaFilters,
  parseMediaFilters,
} from '@/domains/account/ui/filters/filtering';
import { useAccountMediaFeedState } from '@/domains/account/hooks/media-feed-state';
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
export default function AccountWatchedFeed({
  auth,
  canShowWatchedGrid,
  isLoading = false,
  isOwner,
  loadError,
  watchedItems,
  onRemoveItem,
}) {
  const { collectionRootPath, updateView, viewState } = useAccountMediaFeedState({
    allowedEyeFlags: ALLOWED_FLAGS,
  });

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
      isLoading={isLoading}
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
                ? () =>
                    updateView({
                      media: parseMediaFilters(new URLSearchParams(), {
                        allowedEyeFlags: ALLOWED_FLAGS,
                      }),
                      page: 1,
                    })
                : null
            }
          />
        ) : null
      }
      title="Watched"
    />
  );
}
