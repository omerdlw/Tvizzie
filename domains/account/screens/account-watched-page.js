import AccountWatchedFeed from '@/domains/account/ui/feeds/watched';
import {
  createAccountSectionRegistry,
  createAccountSectionView,
} from '@/domains/account/ui/route/section-factory';

export const Registry = createAccountSectionRegistry({
  displayName: 'AccountWatchedRegistry',
  navDescription: 'Watched',
  navRegistrySource: 'account-watched',
});

export default createAccountSectionView({
  activeSection: 'watched',
  displayName: 'AccountWatchedView',
  Registry,
  skeletonVariant: 'collection',
  renderContent: (sectionState, { handleRequestRemoveWatchedItem, loadError, watchedItems }) => (
    <AccountWatchedFeed
      auth={sectionState.auth}
      canShowWatchedGrid={sectionState.canViewProfileCollections}
      isOwner={sectionState.isOwner}
      loadError={loadError}
      watchedItems={watchedItems}
      onRemoveItem={handleRequestRemoveWatchedItem}
    />
  ),
});
