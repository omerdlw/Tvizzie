'use client';

import { deleteUserList } from '@/core/services/media';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback } from 'react';

export function useAccountListActions({
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
}) {
  const router = useRouter();
  const pathname = usePathname();

  const handleEditList = useCallback(
    (list) => {
      const targetList = list || selectedList;

      if (!isOwner || !auth.user?.id) return;
      if (!targetList?.id) return;

      openModal(
        'LIST_EDITOR_MODAL',
        { desktop: 'center', mobile: 'bottom' },
        {
          data: {
            isOwner: true,
            userId: auth.user.id,
            initialData: targetList,
            initialItems: targetList?.id === selectedList?.id ? listItems : [],
            onItemsChange: targetList?.id === selectedList?.id ? setListItems : null,
          },
        }
      );
    },
    [auth.user?.id, isOwner, listItems, openModal, selectedList, setListItems]
  );

  const handleDeleteList = useCallback(
    (list) => {
      const targetList = list || selectedList;

      if (!isOwner || !auth.user?.id) return;
      if (!targetList?.id) return;

      setListDeleteConfirmation({
        title: 'Delete List?',
        confirmText: 'Delete List',
        description: 'This removes the list and all items inside it from your profile',
        isDestructive: true,
        onCancel: () => setListDeleteConfirmation(null),
        onConfirm: async () => {
          let previousLists = null;

          if (typeof setLists === 'function') {
            setLists((currentLists) => {
              previousLists = currentLists;
              return currentLists.filter((current) => current?.id !== targetList.id);
            });
          }

          try {
            await deleteUserList({
              listId: targetList.id,
              userId: auth.user.id,
            });
            setListDeleteConfirmation(null);

            if (activeListId === targetList.id) {
              if (pathname.includes('/lists/') && profileHandle) {
                router.push(`/account/${profileHandle}/lists`);
              } else {
                updateQuery({ list: null, tab: 'lists' });
              }
            }
          } catch (error) {
            if (previousLists && typeof setLists === 'function') {
              setLists(previousLists);
            }
            toast.error(error?.message || 'The list could not be deleted');
            throw error;
          }
        },
      });
    },
    [activeListId, auth.user?.id, isOwner, pathname, profileHandle, router, selectedList, setListDeleteConfirmation, setLists, toast, updateQuery]
  );

  return {
    handleDeleteList,
    handleEditList,
  };
}
