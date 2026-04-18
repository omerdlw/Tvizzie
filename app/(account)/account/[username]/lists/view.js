import AccountListsFeed from '@/features/account/feeds/lists';
import AccountAction from '@/features/navigation/actions/account-action';
import { createAccountSectionRegistry, createAccountSectionView } from '../../shared/section-factory';

export const Registry = createAccountSectionRegistry({
  displayName: 'AccountListsRegistry',
  navDescription: 'Lists',
  navRegistrySource: 'account-lists',
  resolveOverrides: (sectionState, { listDeleteConfirmation, onCreateList = null }) => ({
    listDeleteConfirmation,
    navActionOverride:
      sectionState.isOwner && typeof onCreateList === 'function' ? (
        <AccountAction
          mode="single-action"
          actionIcon="material-symbols:add-rounded"
          actionLabel="Create List"
          onAction={onCreateList}
        />
      ) : null,
  }),
});

export default createAccountSectionView({
  activeSection: 'lists',
  displayName: 'AccountListsView',
  Registry,
  resolveRegistryProps: (_, { listDeleteConfirmation, onCreateList }) => ({
    listDeleteConfirmation,
    onCreateList,
  }),
  skeletonVariant: 'lists',
  renderContent: (sectionState, { handleDeleteList, handleEditList, lists }) => (
    <AccountListsFeed
      canShowLists={sectionState.canViewProfileCollections}
      isOwner={sectionState.isOwner}
      lists={lists}
      onDeleteList={handleDeleteList}
      onEditList={handleEditList}
      username={sectionState.username}
    />
  ),
});
