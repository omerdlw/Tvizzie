'use client';

import { getMediaTitle, removeAccountCollectionItem } from '../../collections/item-utils';
import { removeUserLike, removeUserWatchedItem, removeUserWatchlistItem, toggleUserListItem } from '@/core/services/media';
import { useCallback } from 'react';

function buildRemoveConfirmation({ description, handler, item, setItemRemoveConfirmation, title }) {
  return {
    title,
    description: `${getMediaTitle(item)} ${description}`,
    confirmText: 'Remove',
    confirmLoadingText: 'Removing',
    isDestructive: true,
    onCancel: () => setItemRemoveConfirmation(null),
    onConfirm: () => handler(item),
  };
}

export function useAccountItemRemovalActions({
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
  const handleRemoveListItem = useCallback(
    async (item) => {
      if (!isOwner || !selectedList || !auth.user?.id) return;

      let previousListItems = null;

      setListItems((currentItems) => {
        previousListItems = currentItems;
        return removeAccountCollectionItem(currentItems, item);
      });

      try {
        await toggleUserListItem({
          listId: selectedList.id,
          media: item,
          userId: auth.user.id,
        });
        setItemRemoveConfirmation(null);
      } catch (error) {
        if (previousListItems) {
          setListItems(previousListItems);
        }
        toast.error(error?.message || 'The item could not be removed');
        throw error;
      }
    },
    [auth.user?.id, isOwner, selectedList, setItemRemoveConfirmation, setListItems, toast]
  );

  const handleRemoveLike = useCallback(
    async (item) => {
      if (!isOwner || !auth.user?.id) return;

      let previousLikes = null;

      setLikes((currentLikes) => {
        previousLikes = currentLikes;
        return removeAccountCollectionItem(currentLikes, item);
      });

      try {
        await removeUserLike({
          media: item,
          mediaKey: item?.mediaKey || null,
          userId: auth.user.id,
        });
        setItemRemoveConfirmation(null);
      } catch (error) {
        if (previousLikes) {
          setLikes(previousLikes);
        }
        toast.error(error?.message || 'The item could not be removed');
        throw error;
      }
    },
    [auth.user?.id, isOwner, setItemRemoveConfirmation, setLikes, toast]
  );

  const handleRemoveWatchlistItem = useCallback(
    async (item) => {
      if (!isOwner || !auth.user?.id) return;

      let previousWatchlist = null;

      setWatchlist((currentWatchlist) => {
        previousWatchlist = currentWatchlist;
        return removeAccountCollectionItem(currentWatchlist, item);
      });

      try {
        await removeUserWatchlistItem({
          media: item,
          mediaKey: item?.mediaKey || null,
          userId: auth.user.id,
        });
        setItemRemoveConfirmation(null);
      } catch (error) {
        if (previousWatchlist) {
          setWatchlist(previousWatchlist);
        }
        toast.error(error?.message || 'The item could not be removed');
        throw error;
      }
    },
    [auth.user?.id, isOwner, setItemRemoveConfirmation, setWatchlist, toast]
  );

  const handleRemoveWatchedItem = useCallback(
    async (item) => {
      if (!isOwner || !auth.user?.id) return;

      let previousWatched = null;

      setWatched((currentWatched) => {
        previousWatched = currentWatched;
        return removeAccountCollectionItem(currentWatched, item);
      });

      try {
        await removeUserWatchedItem({
          media: item,
          mediaKey: item?.mediaKey || null,
          userId: auth.user.id,
        });
        setItemRemoveConfirmation(null);
      } catch (error) {
        if (previousWatched) {
          setWatched(previousWatched);
        }
        toast.error(error?.message || 'The item could not be removed');
        throw error;
      }
    },
    [auth.user?.id, isOwner, setItemRemoveConfirmation, setWatched, toast]
  );

  const handleRequestRemoveListItem = useCallback(
    (item) => {
      if (!isOwner) return;

      setItemRemoveConfirmation(
        buildRemoveConfirmation({
          description: 'will be removed from this list.',
          handler: handleRemoveListItem,
          item,
          setItemRemoveConfirmation,
          title: 'Remove List Item?',
        })
      );
    },
    [handleRemoveListItem, isOwner, setItemRemoveConfirmation]
  );

  const handleRequestRemoveLike = useCallback(
    (item) => {
      if (!isOwner) return;

      setItemRemoveConfirmation(
        buildRemoveConfirmation({
          description: 'will be removed from your likes.',
          handler: handleRemoveLike,
          item,
          setItemRemoveConfirmation,
          title: 'Remove Like?',
        })
      );
    },
    [handleRemoveLike, isOwner, setItemRemoveConfirmation]
  );

  const handleRequestRemoveWatchlistItem = useCallback(
    (item) => {
      if (!isOwner) return;

      setItemRemoveConfirmation(
        buildRemoveConfirmation({
          description: 'will be removed from your watchlist.',
          handler: handleRemoveWatchlistItem,
          item,
          setItemRemoveConfirmation,
          title: 'Remove Watchlist Item?',
        })
      );
    },
    [handleRemoveWatchlistItem, isOwner, setItemRemoveConfirmation]
  );

  const handleRequestRemoveWatchedItem = useCallback(
    (item) => {
      if (!isOwner) return;

      setItemRemoveConfirmation(
        buildRemoveConfirmation({
          description: 'will be removed from your watched films.',
          handler: handleRemoveWatchedItem,
          item,
          setItemRemoveConfirmation,
          title: 'Remove Watched Item?',
        })
      );
    },
    [handleRemoveWatchedItem, isOwner, setItemRemoveConfirmation]
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
