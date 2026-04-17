'use client';

import { useCallback } from 'react';

import { useRouter } from 'next/navigation';

import { ACCOUNT_LIST_CREATOR_PATH } from '@/features/account/utils';
import { createAccountSectionClient } from '../../shared/section-factory';
import ListsView from './view';

function useListsClientState({ sectionState }) {
  const router = useRouter();
  const { handleDeleteList, handleEditList, listDeleteConfirmation, lists } = sectionState;

  const handleOpenListCreator = useCallback(() => {
    router.push(ACCOUNT_LIST_CREATOR_PATH);
  }, [router]);

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
