'use client';

import { createAccountSectionClient } from '@/domains/account/ui/sections/account-section-factory';
import AccountWatchedFeed from '@/domains/account/ui/sections/collections/watched-collection';
import {
  createAccountSectionRegistry,
  createAccountSectionView,
} from '@/domains/account/ui/sections/account-section-factory';

function useWatchedClientState({ sectionState }) {
  const { handleRequestRemoveWatchedItem, isWatchedLoading, watched } = sectionState;

  return {
    handleRequestRemoveWatchedItem,
    isWatchedLoading,
    watchedItems: watched,
  };
}

export const Registry = createAccountSectionRegistry({
  displayName: 'AccountWatchedRegistry',
  navDescription: 'Watched',
  navRegistrySource: 'account-watched',
});

const WatchedView = createAccountSectionView({
  activeSection: 'watched',
  displayName: 'AccountWatchedView',
  Registry,
  skeletonVariant: 'collection',
  renderContent: (
    sectionState,
    { handleRequestRemoveWatchedItem, isWatchedLoading, watchedItems },
  ) => (
    <AccountWatchedFeed
      auth={sectionState.auth}
      canShowWatchedGrid={sectionState.canViewProfileCollections}
      isLoading={isWatchedLoading}
      isOwner={sectionState.isOwner}
      watchedItems={watchedItems}
      onRemoveItem={handleRequestRemoveWatchedItem}
    />
  ),
});

const AccountWatchedView = createAccountSectionClient({
  activeTab: 'watched',
  displayName: 'AccountWatchedClient',
  View: WatchedView,
  useSectionClientState: useWatchedClientState,
});

export default AccountWatchedView;
