'use client';

import { getLikeDocRef, getWatchlistDocRef, updateUserMediaPosition } from '@/core/services/media';
import { useCallback } from 'react';

function getReorderDocRef({ item, selectedList, tab, userId }) {
  if (tab === 'likes') {
    return getLikeDocRef(userId, item);
  }

  if (tab === 'watchlist') {
    return getWatchlistDocRef(userId, item);
  }

  if (tab === 'lists' && selectedList) {
    return {
      id: item.mediaKey,
      listId: selectedList.id,
      table: 'list_items',
      userId,
    };
  }

  return null;
}

export function useAccountReorderAction({
  auth,
  isOwner,
  selectedList,
  setLikes,
  setListItems,
  setWatchlist,
  toast,
}) {
  return useCallback(
    async (nextItems, tab) => {
      if (!isOwner || !auth.user?.id) return;

      if (tab === 'likes') setLikes(nextItems);
      if (tab === 'watchlist') setWatchlist(nextItems);
      if (tab === 'lists') setListItems(nextItems);

      try {
        const now = Date.now();
        const updates = nextItems
          .map((item, index) => {
            const newPosition = now - index;
            const docRef = getReorderDocRef({
              item,
              selectedList,
              tab,
              userId: auth.user.id,
            });

            return docRef ? updateUserMediaPosition(docRef, newPosition) : null;
          })
          .filter(Boolean);

        await Promise.all(updates);
      } catch (error) {
        console.error(`[Profile] Failed to persist reorder for ${tab}:`, error);
        toast.error('Could not save custom order');
        throw error;
      }
    },
    [auth.user?.id, isOwner, selectedList, setLikes, setListItems, setWatchlist, toast]
  );
}
