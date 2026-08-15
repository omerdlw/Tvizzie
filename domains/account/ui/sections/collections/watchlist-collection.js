'use client';

import MediaCollectionFeed from './media-collection-feed';

const VISIBILITY_OPTIONS = Object.freeze([
  Object.freeze({ key: 'hide_unreleased', label: 'Hide unreleased titles' }),
  Object.freeze({ key: 'hide_documentaries', label: 'Hide documentaries' }),
]);

export default function AccountWatchlistFeed({
  auth,
  canShowWatchlistGrid,
  isLoading = false,
  isOwner,
  loadError,
  watchlist,
  onRemoveItem,
}) {
  return (
    <MediaCollectionFeed
      auth={auth}
      canShowGrid={canShowWatchlistGrid}
      emptyMessage="No watchlist titles yet"
      icon="solar:bookmark-bold"
      isLoading={isLoading}
      isOwner={isOwner}
      items={watchlist}
      loadError={loadError}
      onRemoveItem={onRemoveItem}
      removeLabelFn={(item) => `Remove ${item.title || item.name} from watchlist`}
      title="Watchlist"
      visibilityOptions={VISIBILITY_OPTIONS}
      filterKeysType="watchlistKeys"
    />
  );
}
