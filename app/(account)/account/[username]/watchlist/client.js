'use client';

import { useAuth } from '@/core/modules/auth';
import { useAccountSectionEngine } from '../shared/section-engine';
import { AccountSectionStateProvider } from '../shared/section-context';
import WatchlistView from './view';

export default function Client({ routeData = null }) {
  const auth = useAuth();
  const { sectionProviderValue, sectionState } = useAccountSectionEngine({
    activeTab: 'watchlist',
    auth,
    routeData,
  });
  const { handleRequestRemoveWatchlistItem, watchlist } = sectionState;

  return (
    <AccountSectionStateProvider value={sectionProviderValue}>
      <WatchlistView watchlist={watchlist} handleRequestRemoveWatchlistItem={handleRequestRemoveWatchlistItem} />
    </AccountSectionStateProvider>
  );
}
