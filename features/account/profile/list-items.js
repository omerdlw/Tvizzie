'use client';

import { useToast } from '@/core/modules/notification/hooks';
import { subscribeToUserListItems } from '@/core/services/media/lists.service';
import { notifyAccountLoadError } from '@/features/account/shared/load-error';
import { useEffect, useState } from 'react';

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
        onError: (error) => {
          setListItems([]);
          notifyAccountLoadError(toast, error, 'List items could not be loaded');
          setIsLoadingListItems(false);
        },
      }
    );
  }, [activeListId, activeTab, canViewPrivateContent, isOwner, isPrivateProfile, resolvedUserId, toast]);

  return {
    isLoadingListItems,
    listItems,
    setListItems,
  };
}
