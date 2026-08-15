'use client';

import MediaCollectionFeed from './media-collection-feed';

const VISIBILITY_OPTIONS = Object.freeze([
  Object.freeze({ key: 'hide_rewatched', label: 'Hide rewatched titles' }),
  Object.freeze({ key: 'hide_unreleased', label: 'Hide unreleased titles' }),
  Object.freeze({ key: 'hide_documentaries', label: 'Hide documentaries' }),
]);

export default function AccountWatchedFeed({
  auth,
  canShowWatchedGrid,
  isLoading = false,
  isOwner,
  loadError,
  watchedItems,
  onRemoveItem,
}) {
  return (
    <MediaCollectionFeed
      auth={auth}
      canShowGrid={canShowWatchedGrid}
      emptyMessage="No watched titles yet"
      icon="solar:eye-bold"
      isLoading={isLoading}
      isOwner={isOwner}
      items={watchedItems}
      loadError={loadError}
      onRemoveItem={onRemoveItem}
      removeLabelFn={(item) => `Remove ${item.title || item.name} from watched`}
      title="Watched"
      visibilityOptions={VISIBILITY_OPTIONS}
      filterKeysType="watchedKeys"
    />
  );
}
