'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/modules/notification';
import { TMDB_IMG } from '@/shared/constants';
import { ensureLegacyFavoritesBackfilled, getLikeDocRef, removeUserLike, subscribeToUserLikes } from '@/domains/media/server/likes';
import { toggleUserListItem, subscribeToUserLists } from '@/domains/media/server/lists';
import {
  getWatchlistDocRef,
  removeUserWatchedItem,
  removeUserWatchlistItem,
  subscribeToUserWatched,
  subscribeToUserWatchlist,
} from '@/domains/media/server/watched-watchlist';
import { updateUserMediaPosition } from '@/domains/media/utils/user-media';
import { getMediaTitle, notifyAccountLoadError, removeAccountCollectionItem } from '@/domains/account/utils';

// ============================================================
// Collection Seed State & Constants
// ============================================================

export const EMPTY_COLLECTION_COUNTS = Object.freeze({
  likes: 0,
  lists: 0,
  watched: 0,
  watchlist: 0,
});

export const UNRESOLVED_COLLECTION_COUNTS = Object.freeze({
  likes: null,
  lists: null,
  watched: null,
  watchlist: null,
});

function normalizeCollectionCount(value) {
  if (value === null || value === undefined) return null;
  return Number(value) || 0;
}

function getCollectionItems(initialCollections, key, hasSeededCollectionSnapshot) {
  if (!hasSeededCollectionSnapshot || !Array.isArray(initialCollections?.[key])) return [];
  return initialCollections[key];
}

function getCollectionCount(initialCollections, key, hasSeededCollectionSnapshot) {
  if (!hasSeededCollectionSnapshot) return null;
  return normalizeCollectionCount(initialCollections?.counts?.[key]);
}

function hasUsableSeededItems(items, seededCount, hasSeededCollectionSnapshot) {
  if (!hasSeededCollectionSnapshot || !Array.isArray(items)) return false;
  return items.length > 0;
}

export function getCollectionPreviewLimits(previewLimits = null) {
  return {
    likes: Number(previewLimits?.likes) || 0,
    lists: Number(previewLimits?.lists) || 0,
    watched: Number(previewLimits?.watched) || 0,
    watchlist: Number(previewLimits?.watchlist) || 0,
  };
}

export function hasAnyCollectionPreviewLimit(previewLimits = {}) {
  return Object.values(previewLimits).some((value) => Number(value) > 0);
}

export function createCollectionCountsForUnavailableState(isPreviewOnlyMode) {
  return isPreviewOnlyMode ? UNRESOLVED_COLLECTION_COUNTS : EMPTY_COLLECTION_COUNTS;
}

export function createSeededCollectionState({ initialCollections = null, resolvedUserId }) {
  const hasSeededCollectionSnapshot =
    Boolean(initialCollections?.userId) &&
    Boolean(resolvedUserId) &&
    initialCollections.userId === resolvedUserId;

  const items = {
    likes: getCollectionItems(initialCollections, 'likes', hasSeededCollectionSnapshot),
    lists: getCollectionItems(initialCollections, 'lists', hasSeededCollectionSnapshot),
    watched: getCollectionItems(initialCollections, 'watched', hasSeededCollectionSnapshot),
    watchlist: getCollectionItems(initialCollections, 'watchlist', hasSeededCollectionSnapshot),
  };
  const counts = {
    likes: getCollectionCount(initialCollections, 'likes', hasSeededCollectionSnapshot),
    lists: getCollectionCount(initialCollections, 'lists', hasSeededCollectionSnapshot),
    watched: getCollectionCount(initialCollections, 'watched', hasSeededCollectionSnapshot),
    watchlist: getCollectionCount(initialCollections, 'watchlist', hasSeededCollectionSnapshot),
  };

  return {
    counts: hasSeededCollectionSnapshot ? counts : UNRESOLVED_COLLECTION_COUNTS,
    hasSeededCollectionSnapshot,
    hasSeededItems: {
      likes: hasUsableSeededItems(items.likes, counts.likes, hasSeededCollectionSnapshot),
      lists: hasUsableSeededItems(items.lists, counts.lists, hasSeededCollectionSnapshot),
      watched: hasUsableSeededItems(items.watched, counts.watched, hasSeededCollectionSnapshot),
      watchlist: hasUsableSeededItems(items.watchlist, counts.watchlist, hasSeededCollectionSnapshot),
    },
    items,
  };
}

export function getSeededCollectionUsage({ hasSeededItems, shouldForcePrivateRefresh }) {
  return {
    likes: Boolean(hasSeededItems?.likes && !shouldForcePrivateRefresh),
    lists: Boolean(hasSeededItems?.lists && !shouldForcePrivateRefresh),
    watched: Boolean(hasSeededItems?.watched && !shouldForcePrivateRefresh),
    watchlist: Boolean(hasSeededItems?.watchlist && !shouldForcePrivateRefresh),
  };
}

// ============================================================
// Collection Metadata Merger
// ============================================================

function normalizeMediaIdentity(item = {}) {
  const mediaKey = String(item?.mediaKey || '').trim();
  if (mediaKey) return mediaKey;

  const entityType = String(item?.entityType || item?.media_type || '').trim().toLowerCase();
  const entityId = String(item?.entityId || item?.id || '').trim();
  if (!entityType || !entityId) return '';
  return `${entityType}:${entityId}`;
}

function hasGenreMetadata(item = {}) {
  return (
    (Array.isArray(item?.genre_ids) && item.genre_ids.length > 0) ||
    (Array.isArray(item?.genreNames) && item.genreNames.length > 0) ||
    (Array.isArray(item?.genres) && item.genres.length > 0)
  );
}

export function mergeCollectionItemsWithExistingMetadata(currentItems = [], nextItems = []) {
  const previousItemMap = new Map(
    (Array.isArray(currentItems) ? currentItems : [])
      .map((item) => [normalizeMediaIdentity(item), item])
      .filter(([key]) => Boolean(key)),
  );

  return (Array.isArray(nextItems) ? nextItems : []).map((item) => {
    if (hasGenreMetadata(item)) return item;
    const previousItem = previousItemMap.get(normalizeMediaIdentity(item));
    if (!previousItem || !hasGenreMetadata(previousItem)) return item;

    return {
      ...item,
      genreNames: Array.isArray(previousItem.genreNames) ? previousItem.genreNames : item.genreNames,
      genre_ids: Array.isArray(previousItem.genre_ids) ? previousItem.genre_ids : item.genre_ids,
      genres: Array.isArray(previousItem.genres) ? previousItem.genres : item.genres,
    };
  });
}

// ============================================================
// Collection Remove Actions Hook
// ============================================================

function createRemoveConfirmation({ item, onCancel, onConfirm, scope }) {
  const poster = item?.poster_path || item?.posterPath;
  return {
    title: `Remove ${scope.title}?`,
    description: `${getMediaTitle(item)} will be removed from your ${scope.descriptionTarget}.`,
    confirmText: 'Remove',
    confirmLoadingText: 'Removing',
    isDestructive: true,
    icon: poster ? `${TMDB_IMG}/w342${poster}` : undefined,
    onCancel,
    onConfirm,
  };
}

async function removeWithOptimisticState({ item, serviceCall, setConfirmation, setItems, toast, onRemove }) {
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
    if (previousItems) setItems(previousItems);
    toast.error(error?.message || 'The item could not be removed');
    throw error;
  }
}

export function useAccountCollectionRemoveActions({
  auth,
  decrementCollectionCount,
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
        serviceCall: () => toggleUserListItem({ listId: selectedList.id, media: item, userId: auth.user.id }),
        setConfirmation: setItemRemoveConfirmation,
        setItems: setListItems,
        toast,
      });
    },
    [auth.user?.id, canMutateCollection, selectedList, setItemRemoveConfirmation, setListItems, toast],
  );

  const handleRemoveLike = useCallback(
    async (item) => {
      if (!canMutateCollection) return;
      await removeWithOptimisticState({
        item,
        serviceCall: () => removeUserLike({ media: item, mediaKey: item?.mediaKey || null, userId: auth.user.id }),
        setConfirmation: setItemRemoveConfirmation,
        setItems: setLikes,
        toast,
        onRemove: () => decrementCollectionCount?.('likes'),
      });
    },
    [auth.user?.id, canMutateCollection, decrementCollectionCount, setItemRemoveConfirmation, setLikes, toast],
  );

  const handleRemoveWatchlistItem = useCallback(
    async (item) => {
      if (!canMutateCollection) return;
      await removeWithOptimisticState({
        item,
        serviceCall: () => removeUserWatchlistItem({ media: item, mediaKey: item?.mediaKey || null, userId: auth.user.id }),
        setConfirmation: setItemRemoveConfirmation,
        setItems: setWatchlist,
        toast,
        onRemove: () => decrementCollectionCount?.('watchlist'),
      });
    },
    [auth.user?.id, canMutateCollection, decrementCollectionCount, setItemRemoveConfirmation, setWatchlist, toast],
  );

  const handleRemoveWatchedItem = useCallback(
    async (item) => {
      if (!canMutateCollection) return;
      await removeWithOptimisticState({
        item,
        serviceCall: () => removeUserWatchedItem({ media: item, mediaKey: item?.mediaKey || null, userId: auth.user.id }),
        setConfirmation: setItemRemoveConfirmation,
        setItems: setWatched,
        toast,
        onRemove: () => decrementCollectionCount?.('watched'),
      });
    },
    [auth.user?.id, canMutateCollection, decrementCollectionCount, setItemRemoveConfirmation, setWatched, toast],
  );

  const requestRemove = useCallback(
    ({ item, onConfirm, scope }) => {
      if (!isOwner) return;
      setItemRemoveConfirmation(createRemoveConfirmation({ item, onCancel: clearConfirmation, onConfirm: () => onConfirm(item), scope }));
    },
    [clearConfirmation, isOwner, setItemRemoveConfirmation],
  );

  return {
    handleRemoveLike,
    handleRemoveListItem,
    handleRemoveWatchedItem,
    handleRemoveWatchlistItem,
    handleRequestRemoveLike: (item) => requestRemove({ item, onConfirm: handleRemoveLike, scope: { descriptionTarget: 'likes', title: 'Like' } }),
    handleRequestRemoveListItem: (item) => requestRemove({ item, onConfirm: handleRemoveListItem, scope: { descriptionTarget: 'this list', title: 'List Item' } }),
    handleRequestRemoveWatchedItem: (item) => requestRemove({ item, onConfirm: handleRemoveWatchedItem, scope: { descriptionTarget: 'watched titles', title: 'Watched Item' } }),
    handleRequestRemoveWatchlistItem: (item) => requestRemove({ item, onConfirm: handleRemoveWatchlistItem, scope: { descriptionTarget: 'watchlist', title: 'Watchlist Item' } }),
  };
}

// ============================================================
// Collection Reorder Actions Hook
// ============================================================

export function useAccountCollectionReorderActions({ auth, isOwner, selectedList, setLikes, setListItems, setWatchlist, toast }) {
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
            const docRef = tab === 'likes' ? getLikeDocRef(auth.user.id, item) : tab === 'watchlist' ? getWatchlistDocRef(auth.user.id, item) : tab === 'lists' && selectedList ? { id: item.mediaKey, listId: selectedList.id, table: 'list_items', userId: auth.user.id } : null;
            return docRef ? updateUserMediaPosition(docRef, now - index) : null;
          })
          .filter(Boolean);

        await Promise.all(updates);
      } catch (error) {
        toast.error('Could not save custom order');
        throw error;
      }
    },
    [auth.user?.id, isOwner, selectedList, setLikes, setListItems, setWatchlist, toast],
  );
}

// ============================================================
// Main useAccountCollections Hook
// ============================================================

export function useAccountCollections({
  activeTab = null,
  authIsAuthenticated,
  authIsReady,
  canViewPrivateContent,
  initialCollections = null,
  isOwner,
  isPrivateProfile,
  previewLimits = null,
  resolvedUserId,
}) {
  const toast = useToast();
  const normalizedPreviewLimits = useMemo(() => getCollectionPreviewLimits(previewLimits), [previewLimits]);
  const seededState = useMemo(() => createSeededCollectionState({ initialCollections, resolvedUserId }), [initialCollections, resolvedUserId]);
  const shouldForcePrivateRefresh = !isOwner && isPrivateProfile === true && canViewPrivateContent;
  const shouldUseSeeded = useMemo(() => getSeededCollectionUsage({ hasSeededItems: seededState.hasSeededItems, shouldForcePrivateRefresh }), [seededState.hasSeededItems, shouldForcePrivateRefresh]);

  const [likes, setLikes] = useState(seededState.items.likes);
  const [watched, setWatched] = useState(seededState.items.watched);
  const [watchlist, setWatchlist] = useState(seededState.items.watchlist);
  const [lists, setLists] = useState(seededState.items.lists);
  const [collectionCounts, setCollectionCounts] = useState(seededState.counts);
  const [isLikesLoading, setIsLikesLoading] = useState(!shouldUseSeeded.likes);
  const [isWatchedLoading, setIsWatchedLoading] = useState(!shouldUseSeeded.watched);
  const [isWatchlistLoading, setIsWatchlistLoading] = useState(!shouldUseSeeded.watchlist);
  const [isListsLoading, setIsListsLoading] = useState(!shouldUseSeeded.lists);

  useEffect(() => {
    const isPreviewOnlyMode = hasAnyCollectionPreviewLimit(normalizedPreviewLimits);
    const normalizedActiveTab = String(activeTab || '').trim().toLowerCase();

    const shouldScopeByActiveTab =
      Boolean(normalizedActiveTab) && normalizedActiveTab !== 'overview';
    const shouldSubscribeLikes = !shouldScopeByActiveTab || normalizedActiveTab === 'likes';
    const shouldSubscribeLists = !shouldScopeByActiveTab || normalizedActiveTab === 'lists';
    const shouldSubscribeWatched = !shouldScopeByActiveTab || normalizedActiveTab === 'watched';
    const shouldSubscribeWatchlist = !shouldScopeByActiveTab || normalizedActiveTab === 'watchlist';

    if (!resolvedUserId) {
      setLikes([]);
      setWatched([]);
      setWatchlist([]);
      setLists([]);
      setCollectionCounts(EMPTY_COLLECTION_COUNTS);
      setIsLikesLoading(false);
      setIsWatchedLoading(false);
      setIsWatchlistLoading(false);
      setIsListsLoading(false);
      return undefined;
    }

    if (!authIsReady) {
      return undefined;
    }

    if (isOwner && !authIsAuthenticated) {
      if (seededState.hasSeededCollectionSnapshot) {
        setLikes(seededState.items.likes);
        setWatched(seededState.items.watched);
        setWatchlist(seededState.items.watchlist);
        setLists(seededState.items.lists);
        setCollectionCounts(seededState.counts);
        setIsLikesLoading(false);
        setIsWatchedLoading(false);
        setIsWatchlistLoading(false);
        setIsListsLoading(false);
        return undefined;
      }

      setLikes([]);
      setWatched([]);
      setWatchlist([]);
      setLists([]);
      setCollectionCounts(createCollectionCountsForUnavailableState(isPreviewOnlyMode));
      setIsLikesLoading(false);
      setIsWatchedLoading(false);
      setIsWatchlistLoading(false);
      setIsListsLoading(false);
      return undefined;
    }

    let isDisposed = false;
    let unsubLikes = () => {};
    let unsubWatched = () => {};
    let unsubWatchlist = () => {};
    let unsubLists = () => {};

    if (isOwner) {
      ensureLegacyFavoritesBackfilled(resolvedUserId).catch((err) => {
        if (process.env.NODE_ENV !== 'production') console.warn('[Profile] Favorites backfill warning:', err);
      });
    }

    if (shouldSubscribeLikes) {
      unsubLikes = subscribeToUserLikes(
        resolvedUserId,
        (nextLikes) => {
          if (isDisposed) return;
          setLikes((current) => mergeCollectionItemsWithExistingMetadata(current, nextLikes));
          setCollectionCounts((prev) => ({
            ...prev,
            // A preview is intentionally truncated; never expose its length
            // as the user's total collection count.
            likes: normalizedPreviewLimits.likes > 0 ? prev.likes : nextLikes.length,
          }));
          setIsLikesLoading(false);
        },
        {
          onError: (error) => {
            setIsLikesLoading(false);
            notifyAccountLoadError(toast, error, 'Likes');
          },
          limitCount: normalizedPreviewLimits.likes,
          seededItems: shouldUseSeeded.likes ? seededState.items.likes : null,
        },
      );
    } else {
      setIsLikesLoading(false);
    }

    if (shouldSubscribeWatched) {
      unsubWatched = subscribeToUserWatched(
        resolvedUserId,
        (nextWatched) => {
          if (isDisposed) return;
          setWatched((current) => mergeCollectionItemsWithExistingMetadata(current, nextWatched));
          setCollectionCounts((prev) => ({
            ...prev,
            watched: normalizedPreviewLimits.watched > 0 ? prev.watched : nextWatched.length,
          }));
          setIsWatchedLoading(false);
        },
        {
          onError: (error) => {
            setIsWatchedLoading(false);
            notifyAccountLoadError(toast, error, 'Watched movies');
          },
          limitCount: normalizedPreviewLimits.watched,
          seededItems: shouldUseSeeded.watched ? seededState.items.watched : null,
        },
      );
    } else {
      setIsWatchedLoading(false);
    }

    if (shouldSubscribeWatchlist) {
      unsubWatchlist = subscribeToUserWatchlist(
        resolvedUserId,
        (nextWatchlist) => {
          if (isDisposed) return;
          setWatchlist((current) => mergeCollectionItemsWithExistingMetadata(current, nextWatchlist));
          setCollectionCounts((prev) => ({
            ...prev,
            watchlist: normalizedPreviewLimits.watchlist > 0 ? prev.watchlist : nextWatchlist.length,
          }));
          setIsWatchlistLoading(false);
        },
        {
          onError: (error) => {
            setIsWatchlistLoading(false);
            notifyAccountLoadError(toast, error, 'Watchlist');
          },
          limitCount: normalizedPreviewLimits.watchlist,
          seededItems: shouldUseSeeded.watchlist ? seededState.items.watchlist : null,
        },
      );
    } else {
      setIsWatchlistLoading(false);
    }

    if (shouldSubscribeLists) {
      unsubLists = subscribeToUserLists(
        resolvedUserId,
        (nextLists) => {
          if (isDisposed) return;
          setLists(nextLists);
          setCollectionCounts((prev) => ({
            ...prev,
            lists: normalizedPreviewLimits.lists > 0 ? prev.lists : nextLists.length,
          }));
          setIsListsLoading(false);
        },
        {
          onError: (error) => {
            setIsListsLoading(false);
            notifyAccountLoadError(toast, error, 'Lists');
          },
          limitCount: normalizedPreviewLimits.lists,
          seededItems: shouldUseSeeded.lists ? seededState.items.lists : null,
        },
      );
    } else {
      setIsListsLoading(false);
    }

    return () => {
      isDisposed = true;
      unsubLikes();
      unsubWatched();
      unsubWatchlist();
      unsubLists();
    };
  }, [activeTab, authIsAuthenticated, authIsReady, canViewPrivateContent, isOwner, normalizedPreviewLimits, resolvedUserId, seededState.counts, seededState.hasSeededCollectionSnapshot, seededState.items.likes, seededState.items.lists, seededState.items.watched, seededState.items.watchlist, shouldForcePrivateRefresh, shouldUseSeeded.likes, shouldUseSeeded.lists, shouldUseSeeded.watched, shouldUseSeeded.watchlist, toast]);

  return {
    collectionCounts,
    isLoadingCollections: isLikesLoading || isWatchedLoading || isWatchlistLoading || isListsLoading,
    isLikesLoading,
    isListsLoading,
    isWatchedLoading,
    isWatchlistLoading,
    likes,
    lists,
    setCollectionCounts,
    setLikes,
    setLists,
    setWatched,
    setWatchlist,
    watched,
    watchlist,
  };
}
