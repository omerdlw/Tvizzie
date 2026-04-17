import AccountWatchedFeed from '@/features/account/feeds/watched';
import { createAccountSectionRegistry, createAccountSectionView } from '../../shared/section-factory';

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
