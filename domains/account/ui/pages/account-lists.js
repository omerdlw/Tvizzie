'use client';

import { useCallback } from 'react';
import { useNavigationActions } from '@/modules/nav';
import { createAccountSectionClient } from '@/domains/account/ui/sections/account-section-factory';
import { createCreateListSurfaceEntry } from '@/domains/shell/navigation/surfaces/list-create-surface';
// ListsView is defined in this route client.
import AccountListsFeed from '@/domains/account/ui/sections/lists/lists-collection';
import AccountAction from '@/domains/shell/navigation/actions/account-action';
import {
  createAccountSectionRegistry,
  createAccountSectionView,
} from '@/domains/account/ui/sections/account-section-factory';

function useListsClientState({ sectionState }) {
  const { openSurface } = useNavigationActions();
  const { handleDeleteList, handleEditList, isListsLoading, listDeleteConfirmation, lists } =
    sectionState;

  const handleOpenListCreator = useCallback(() => {
    openSurface(createCreateListSurfaceEntry());
  }, [openSurface]);

  return {
    handleDeleteList,
    handleEditList,
    isListsLoading,
    listDeleteConfirmation,
    lists,
    onCreateList: handleOpenListCreator,
  };
}

export const Registry = createAccountSectionRegistry({
  displayName: 'AccountListsRegistry',
  navDescription: 'Lists',
  navRegistrySource: 'account-lists',
  resolveOverrides: (sectionState, { listDeleteConfirmation, onCreateList = null }) => {
    const canCreateList =
      sectionState.isOwner ||
      (sectionState.auth?.isAuthenticated &&
        sectionState.auth.user?.id &&
        sectionState.resolvedUserId === sectionState.auth.user.id);

    return {
      listDeleteConfirmation,
      navActionOverride:
        canCreateList && typeof onCreateList === 'function' ? (
          <AccountAction
            mode="single-action"
            actionIcon="material-symbols:add-rounded"
            actionLabel="Create List"
            onAction={onCreateList}
          />
        ) : null,
    };
  },
});

const ListsView = createAccountSectionView({
  activeSection: 'lists',
  displayName: 'AccountListsView',
  Registry,
  resolveRegistryProps: (_, { listDeleteConfirmation, onCreateList }) => ({
    listDeleteConfirmation,
    onCreateList,
  }),
  skeletonVariant: 'lists',
  renderContent: (sectionState, { handleDeleteList, handleEditList, isListsLoading, lists }) => (
    <AccountListsFeed
      canShowLists={sectionState.canViewProfileCollections}
      isLoading={isListsLoading}
      isOwner={sectionState.isOwner}
      lists={lists}
      onDeleteList={handleDeleteList}
      onEditList={handleEditList}
      username={sectionState.username}
    />
  ),
});

const AccountListsView = createAccountSectionClient({
  activeTab: 'lists',
  displayName: 'AccountListsClient',
  View: ListsView,
  useSectionClientState: useListsClientState,
});

export default AccountListsView;
