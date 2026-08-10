'use client';

import { createAccountSectionClient } from '@/domains/account/ui/sections/account-section-factory';
// WatchlistView is defined in this route client.
import AccountWatchlistFeed from '@/domains/account/ui/sections/collections/watchlist-collection';
import {
  createAccountSectionRegistry,
  createAccountSectionView,
} from '@/domains/account/ui/sections/account-section-factory';

function useWatchlistClientState({ sectionState }) {
  const { handleRequestRemoveWatchlistItem, isWatchlistLoading, watchlist } = sectionState;

  return {
    handleRequestRemoveWatchlistItem,
    isWatchlistLoading,
    watchlist,
  };
}

export const Registry = createAccountSectionRegistry({
  displayName: 'AccountWatchlistRegistry',
  navDescription: 'Watchlist',
  navRegistrySource: 'account-watchlist',
});

const WatchlistView = createAccountSectionView({
  activeSection: 'watchlist',
  displayName: 'AccountWatchlistView',
  Registry,
  skeletonVariant: 'collection',
  renderContent: (
    sectionState,
    { handleRequestRemoveWatchlistItem, isWatchlistLoading, watchlist },
  ) => (
    <AccountWatchlistFeed
      auth={sectionState.auth}
      canShowWatchlistGrid={sectionState.canViewProfileCollections}
      isLoading={isWatchlistLoading}
      isOwner={sectionState.isOwner}
      onRemoveItem={handleRequestRemoveWatchlistItem}
      watchlist={watchlist}
    />
  ),
});

export default createAccountSectionClient({
  activeTab: 'watchlist',
  displayName: 'AccountWatchlistClient',
  View: WatchlistView,
  useSectionClientState: useWatchlistClientState,
});
