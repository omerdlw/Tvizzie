'use client';

import { createAccountSectionClient } from '@/domains/account/ui/account-section-factory';
import WatchlistView from '@/domains/account/ui/watchlist-view';

function useWatchlistClientState({ sectionState }) {
  const { handleRequestRemoveWatchlistItem, watchlist } = sectionState;

  return {
    handleRequestRemoveWatchlistItem,
    watchlist,
  };
}

export default createAccountSectionClient({
  activeTab: 'watchlist',
  displayName: 'AccountWatchlistClient',
  View: WatchlistView,
  useSectionClientState: useWatchlistClientState,
});
