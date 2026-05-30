'use client';

import { useCallback } from 'react';

import { getLikeDocRef } from '@/core/services/media/likes';
import { updateUserMediaPosition } from '@/core/services/media/user-media';
import { getWatchlistDocRef } from '@/core/services/media/watched-watchlist';

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

function applyLocalReorder({ nextItems, setLikes, setListItems, setWatchlist, tab }) {
  if (tab === 'likes') setLikes(nextItems);
  if (tab === 'watchlist') setWatchlist(nextItems);
  if (tab === 'lists') setListItems(nextItems);
}

export function useAccountCollectionReorderActions({
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

      applyLocalReorder({
        nextItems,
        setLikes,
        setListItems,
        setWatchlist,
        tab,
      });

      try {
        const now = Date.now();
        const updates = nextItems
          .map((item, index) => {
            const docRef = getReorderDocRef({
              item,
              selectedList,
              tab,
              userId: auth.user.id,
            });

            return docRef ? updateUserMediaPosition(docRef, now - index) : null;
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
