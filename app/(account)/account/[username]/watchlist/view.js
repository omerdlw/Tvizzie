import AccountWatchlistFeed from '@/features/account/feeds/watchlist';
import { createAccountSectionRegistry, createAccountSectionView } from '../../shared/section-factory';

export const Registry = createAccountSectionRegistry({
  displayName: 'AccountWatchlistRegistry',
  navDescription: 'Watchlist',
  navRegistrySource: 'account-watchlist',
});

export default createAccountSectionView({
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
