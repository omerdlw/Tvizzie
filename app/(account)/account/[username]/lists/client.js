'use client';

import { useCallback } from 'react';

import { useModalActions } from '@/core/modules/modal/context';
import { createAccountSectionClient } from '../../shared/section-factory';
import ListsView from './view';

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
