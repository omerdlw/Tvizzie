'use client';

import { createAccountSectionClient } from '@/domains/account/ui/route/section-factory';
import WatchlistView from '@/domains/account/screens/account-watchlist-page';

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
