'use client';

import { useCallback } from 'react';

import { removeUserLike } from '@/core/services/media/likes';
import { toggleUserListItem } from '@/core/services/media/lists';
import { removeUserWatchedItem, removeUserWatchlistItem } from '@/core/services/media/watched-watchlist';
import { getMediaTitle, removeAccountCollectionItem } from '@/features/account/utils';

function createRemoveConfirmation({ item, onCancel, onConfirm, scope }) {
  return {
    title: `Remove ${scope.title}?`,
    description: `${getMediaTitle(item)} will be removed from your ${scope.descriptionTarget}.`,
    confirmText: 'Remove',
    confirmLoadingText: 'Removing',
    isDestructive: true,
    onCancel,
    onConfirm,
  };
}

async function removeWithOptimisticState({ item, onRemove, serviceCall, setConfirmation, setItems, toast }) {
  let previousItems = null;

  setItems((currentItems) => {
    previousItems = currentItems;
    return removeAccountCollectionItem(currentItems, item);
  });

  try {
    await serviceCall();
    setConfirmation(null);
    onRemove?.(item);
  } catch (error) {
    if (previousItems) {
      setItems(previousItems);
    }

    toast.error(error?.message || 'The item could not be removed');
    throw error;
  }
}

export function useAccountCollectionRemoveActions({
  auth,
  isOwner,
  selectedList,
  setItemRemoveConfirmation,
  setLikes,
  setListItems,
  setWatched,
  setWatchlist,
  toast,
}) {
  const canMutateCollection = isOwner && Boolean(auth.user?.id);
  const clearConfirmation = useCallback(() => setItemRemoveConfirmation(null), [setItemRemoveConfirmation]);

  const handleRemoveListItem = useCallback(
    async (item) => {
      if (!canMutateCollection || !selectedList) return;

      await removeWithOptimisticState({
        item,
        serviceCall: () =>
          toggleUserListItem({
            listId: selectedList.id,
            media: item,
            userId: auth.user.id,
          }),
        setConfirmation: setItemRemoveConfirmation,
        setItems: setListItems,
        toast,
      });
    },
    [auth.user?.id, canMutateCollection, selectedList, setItemRemoveConfirmation, setListItems, toast]
  );

  const handleRemoveLike = useCallback(
    async (item) => {
      if (!canMutateCollection) return;

      await removeWithOptimisticState({
        item,
        serviceCall: () =>
          removeUserLike({
            media: item,
            mediaKey: item?.mediaKey || null,
            userId: auth.user.id,
          }),
        setConfirmation: setItemRemoveConfirmation,
        setItems: setLikes,
        toast,
      });
    },
    [auth.user?.id, canMutateCollection, setItemRemoveConfirmation, setLikes, toast]
  );

  const handleRemoveWatchlistItem = useCallback(
    async (item) => {
      if (!canMutateCollection) return;

      await removeWithOptimisticState({
        item,
        serviceCall: () =>
          removeUserWatchlistItem({
            media: item,
            mediaKey: item?.mediaKey || null,
            userId: auth.user.id,
          }),
        setConfirmation: setItemRemoveConfirmation,
        setItems: setWatchlist,
        toast,
      });
    },
    [auth.user?.id, canMutateCollection, setItemRemoveConfirmation, setWatchlist, toast]
  );

  const handleRemoveWatchedItem = useCallback(
    async (item) => {
      if (!canMutateCollection) return;

      await removeWithOptimisticState({
        item,
        serviceCall: () =>
          removeUserWatchedItem({
            media: item,
            mediaKey: item?.mediaKey || null,
            userId: auth.user.id,
          }),
        setConfirmation: setItemRemoveConfirmation,
        setItems: setWatched,
        toast,
      });
    },
    [auth.user?.id, canMutateCollection, setItemRemoveConfirmation, setWatched, toast]
  );

  const requestRemove = useCallback(
    ({ item, onConfirm, scope }) => {
      if (!isOwner) return;

      setItemRemoveConfirmation(
        createRemoveConfirmation({
          item,
          onCancel: clearConfirmation,
          onConfirm: () => onConfirm(item),
          scope,
        })
      );
    },
    [clearConfirmation, isOwner, setItemRemoveConfirmation]
  );

  const handleRequestRemoveListItem = useCallback(
    (item) =>
      requestRemove({
        item,
        onConfirm: handleRemoveListItem,
        scope: {
          descriptionTarget: 'this list',
          title: 'List Item',
        },
      }),
    [handleRemoveListItem, requestRemove]
  );

  const handleRequestRemoveLike = useCallback(
    (item) =>
      requestRemove({
        item,
        onConfirm: handleRemoveLike,
        scope: {
          descriptionTarget: 'likes',
          title: 'Like',
        },
      }),
    [handleRemoveLike, requestRemove]
  );

  const handleRequestRemoveWatchlistItem = useCallback(
    (item) =>
      requestRemove({
        item,
        onConfirm: handleRemoveWatchlistItem,
        scope: {
          descriptionTarget: 'watchlist',
          title: 'Watchlist Item',
        },
      }),
    [handleRemoveWatchlistItem, requestRemove]
  );

  const handleRequestRemoveWatchedItem = useCallback(
    (item) =>
      requestRemove({
        item,
        onConfirm: handleRemoveWatchedItem,
        scope: {
          descriptionTarget: 'watched titles',
          title: 'Watched Item',
        },
      }),
    [handleRemoveWatchedItem, requestRemove]
  );

  return {
    handleRemoveLike,
    handleRemoveListItem,
    handleRemoveWatchedItem,
    handleRemoveWatchlistItem,
    handleRequestRemoveLike,
    handleRequestRemoveListItem,
    handleRequestRemoveWatchedItem,
    handleRequestRemoveWatchlistItem,
  };
}
