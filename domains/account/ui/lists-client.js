'use client';

import { useCallback } from 'react';

import { useModalActions } from '@/modules/modal';
import { createAccountSectionClient } from '@/domains/account/ui/account-section-factory';
import ListsView from '@/domains/account/ui/lists-view';

function useListsClientState({ sectionState }) {
  const { openModal } = useModalActions();
  const { handleDeleteList, handleEditList, listDeleteConfirmation, lists } = sectionState;

  const handleOpenListCreator = useCallback(() => {
    openModal('CREATE_LIST_MODAL');
  }, [openModal]);

  return {
    handleDeleteList,
    handleEditList,
    listDeleteConfirmation,
    lists,
    onCreateList: handleOpenListCreator,
  };
}

export default createAccountSectionClient({
  activeTab: 'lists',
  displayName: 'AccountListsClient',
  View: ListsView,
  useSectionClientState: useListsClientState,
});
