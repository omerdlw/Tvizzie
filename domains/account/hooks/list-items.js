'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/modules/notification';
import { subscribeToUserListItems } from '@/domains/account/client/lists';
import { notifyAccountLoadError } from '@/domains/account/utils/feedback';

export function useAccountListItems({
  activeListId,
  activeTab,
  canViewPrivateContent,
  isOwner,
  isPrivateProfile,
  resolvedUserId,
}) {
  const toast = useToast();
  const [listItems, setListItems] = useState([]);
  const [isLoadingListItems, setIsLoadingListItems] = useState(false);

  useEffect(() => {
    if (activeTab !== 'lists' || !resolvedUserId || !activeListId) {
      setListItems([]);
      setIsLoadingListItems(false);
      return undefined;
    }

    if (!isOwner && isPrivateProfile && !canViewPrivateContent) {
      setListItems([]);
      setIsLoadingListItems(false);
      return undefined;
    }

    setIsLoadingListItems(true);
    return subscribeToUserListItems(
      resolvedUserId,
      activeListId,
      (nextItems) => {
        setListItems(nextItems);
        setIsLoadingListItems(false);
      },
      {
        activeTab,
        onError: (err) => {
          setListItems([]);
          notifyAccountLoadError(toast, err, 'List items could not be loaded');
          setIsLoadingListItems(false);
        },
      },
    );
  }, [
    activeListId,
    activeTab,
    canViewPrivateContent,
    isOwner,
    isPrivateProfile,
    resolvedUserId,
    toast,
  ]);

  return { isLoadingListItems, listItems, setListItems };
}
