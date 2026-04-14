import AccountListsFeed from '@/features/account/feeds/lists';
import { AccountPageShell } from '@/features/account/shared/layout';
import { buildAccountPageShellProps, useAccountSectionState } from '../shared/section-context';
import Registry from './registry';

export default function ListsView({ lists, handleDeleteList, handleEditList, listDeleteConfirmation, onCreateList }) {
  const sectionState = useAccountSectionState();
  const shellProps = buildAccountPageShellProps(sectionState, {
    activeSection: 'lists',
    skeletonVariant: 'lists',
  });

  return (
    <AccountPageShell
      {...shellProps}
      registry={<Registry listDeleteConfirmation={listDeleteConfirmation} onCreateList={onCreateList} />}
    >
      <AccountListsFeed
        canShowLists={sectionState.canViewProfileCollections}
        isOwner={sectionState.isOwner}
        lists={lists}
        onDeleteList={handleDeleteList}
        onEditList={handleEditList}
        username={sectionState.username}
      />
    </AccountPageShell>
  );
}
