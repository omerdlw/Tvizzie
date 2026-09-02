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

export default function MediaCollectionFeed({
  auth,
  canShowGrid,
  emptyMessage,
  icon,
  isLoading = false,
  isOwner,
  items = [],
  loadError,
  onRemoveItem,
  removeLabelFn,
  title,
  visibilityOptions = [],
  filterKeysType = 'watchedKeys',
}) {
  const allowedFlags = useMemo(() => visibilityOptions.map((o) => o.key), [visibilityOptions]);
  const { collectionRootPath, updateView, viewState } = useAccountMediaFeedState({
    allowedEyeFlags: allowedFlags,
  });

  const hasFilters = hasActiveMediaFilters(viewState.media);
  const filteredItems = useMemo(
    () =>
      applyMediaFilters(items, viewState.media, {
        [filterKeysType]: buildMediaKeySet(items),
      }),
    [viewState.media, items, filterKeysType],
  );
  const genreOptions = useMemo(() => collectMediaGenreOptions(items), [items]);

  if (!canShowGrid) return <AccountSectionState message="This profile is private" />;
  if (loadError) return <AccountSectionState message={loadError} />;

  return (
    <AccountMediaGridPage
      currentPage={viewState.page}
      emptyMessage={emptyMessage}
      icon={icon}
      isLoading={isLoading}
      items={filteredItems}
      onPageChange={(page) => updateView({ page })}
      pageBasePath={collectionRootPath}
      showHeader={false}
      renderOverlay={(item) =>
        isOwner ? (
          <ProfileMediaActions
            item={item}
            onRemoveItem={onRemoveItem}
            removeLabel={removeLabelFn(item)}
            currentUserId={auth.user?.id}
          />
        ) : null
      }
      toolbar={
        items.length > 0 || hasFilters ? (
          <AccountMediaFilterBar
            filters={viewState.media}
            decadeOptions={getDecadeOptions()}
            genreOptions={genreOptions}
            visibilityOptions={visibilityOptions}
            onChange={(media) => updateView({ media: { ...viewState.media, ...media }, page: 1 })}
            onReset={
              hasFilters
                ? () =>
                    updateView({
                      media: parseMediaFilters(new URLSearchParams(), {
                        allowedEyeFlags: allowedFlags,
                      }),
                      page: 1,
                    })
                : null
            }
          />
        ) : null
      }
      title={title}
    />
  );
}
