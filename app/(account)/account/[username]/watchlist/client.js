'use client';

import { createAccountSectionClient } from '../../shared/section-factory';
import WatchlistView from './view';

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
