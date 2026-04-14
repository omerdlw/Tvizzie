'use client';

import { useCallback } from 'react';

import { useRouter } from 'next/navigation';

import { ACCOUNT_LIST_CREATOR_PATH } from '@/features/account/utils';
import { useAuth } from '@/core/modules/auth';
import { useAccountSectionEngine } from '../shared/section-engine';
import { AccountSectionStateProvider } from '../shared/section-context';
import ListsView from './view';

export default function Client({ routeData = null }) {
  const auth = useAuth();
  const router = useRouter();

  const { sectionProviderValue, sectionState } = useAccountSectionEngine({
    activeTab: 'lists',
    auth,
    routeData,
  });
  const { handleDeleteList, handleEditList, listDeleteConfirmation, lists } = sectionState;
  const handleOpenListCreator = useCallback(() => {
    router.push(ACCOUNT_LIST_CREATOR_PATH);
  }, [router]);

  return (
    <AccountSectionStateProvider value={sectionProviderValue}>
      <ListsView
        handleDeleteList={handleDeleteList}
        handleEditList={handleEditList}
        listDeleteConfirmation={listDeleteConfirmation}
        lists={lists}
        onCreateList={handleOpenListCreator}
      />
    </AccountSectionStateProvider>
  );
}
