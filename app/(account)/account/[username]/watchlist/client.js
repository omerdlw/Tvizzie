'use client';

import { createAccountSectionClient } from '@/domains/account/ui/sections/account-section-factory';
// WatchlistView is defined in this route client.
import AccountWatchlistFeed from '@/domains/account/ui/sections/feeds/watchlist';
import {
  createAccountSectionRegistry,
  createAccountSectionView,
} from '@/domains/account/ui/sections/account-section-factory';

function useWatchlistClientState({ sectionState }) {
  const { handleRequestRemoveWatchlistItem, watchlist } = sectionState;

  return {
    handleRequestRemoveWatchlistItem,
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
  renderContent: (sectionState, { handleRequestRemoveWatchlistItem, watchlist }) => (
    <AccountWatchlistFeed
      auth={sectionState.auth}
      canShowWatchlistGrid={sectionState.canViewProfileCollections}
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
