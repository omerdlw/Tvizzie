'use client';

import { useModal } from '@/core/modules/modal/context';
import { useToast } from '@/core/modules/notification/hooks';
import { useState } from 'react';
import { useAccountItemRemovalActions } from './item-removal-actions';
import { useAccountListActions } from './list-actions';
import { useAccountReorderAction } from './reorder-action';

export function useAccountCollectionActions({
  activeListId,
  auth,
  isOwner,
  listItems = [],
  profileHandle,
  selectedList,
  setLikes,
  setLists,
  setListItems,
  setWatched,
  setWatchlist,
  updateQuery,
}) {
  const toast = useToast();
  const { openModal } = useModal();
  const [itemRemoveConfirmation, setItemRemoveConfirmation] = useState(null);
  const [listDeleteConfirmation, setListDeleteConfirmation] = useState(null);

  const listActions = useAccountListActions({
    activeListId,
    auth,
    isOwner,
    listItems,
    openModal,
    profileHandle,
    selectedList,
    setListDeleteConfirmation,
    setListItems,
    setLists,
    toast,
    updateQuery,
  });
  const itemRemovalActions = useAccountItemRemovalActions({
    auth,
    isOwner,
    selectedList,
    setItemRemoveConfirmation,
    setLikes,
    setListItems,
    setWatched,
    setWatchlist,
    toast,
  });
  const handleReorder = useAccountReorderAction({
    auth,
    isOwner,
    selectedList,
    setLikes,
    setListItems,
    setWatchlist,
    toast,
  });

  return {
    ...listActions,
    ...itemRemovalActions,
    handleReorder,
    itemRemoveConfirmation,
    listDeleteConfirmation,
  };
}
