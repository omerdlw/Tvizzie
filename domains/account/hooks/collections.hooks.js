'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/modules/notification';
import { TMDB_IMG } from '@/domains/shell/shared/constants';
import {
  getLikeDocRef,
  removeUserLike,
  subscribeToUserLikes,
} from '@/domains/media/client/likes';
import {
  toggleUserListItem,
  subscribeToUserLists,
  subscribeToLikedLists,
} from '@/domains/media/client/lists';
import {
  getWatchlistDocRef,
  removeUserWatchlistItem,
  subscribeToUserWatchlist,
} from '@/domains/media/client/watchlist';
import {
  removeUserWatchedItem,
  subscribeToUserWatched,
} from '@/domains/media/client/watched';
import {
  updateUserMediaPosition,
} from '@/domains/media/utils/poster-preferences';
import {
  getMediaTitle,
  removeAccountCollectionItem,
} from '@/domains/account/utils/formatting';
import {
  notifyAccountLoadError,
} from '@/domains/account/utils/feedback';

export const EMPTY_COLLECTION_COUNTS = Object.freeze({
  likes: 0,
  lists: 0,
  watched: 0,
  watchlist: 0,
  likedLists: 0,
});

export const UNRESOLVED_COLLECTION_COUNTS = Object.freeze({
  likes: null,
  lists: null,
  watched: null,
  watchlist: null,
  likedLists: null,
});

const EMPTY_COLLECTION_ITEMS = Object.freeze({
  likes: [],
  lists: [],
  watched: [],
  watchlist: [],
  likedLists: [],
});

function normalizeCollectionCount(value) {
  if (value === null || value === undefined) return null;
  const count = Number(value);
  return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
}

function getCollectionItems(initialCollections, key, hasSeededCollectionSnapshot) {
  if (!hasSeededCollectionSnapshot || !Array.isArray(initialCollections?.[key])) return [];
  return initialCollections[key];
}

function getCollectionCount(initialCollections, key, hasSeededCollectionSnapshot) {
  if (!hasSeededCollectionSnapshot) return null;
  return normalizeCollectionCount(initialCollections?.counts?.[key]);
}

function hasUsableSeededItems(items, hasSeededCollectionSnapshot) {
  if (!hasSeededCollectionSnapshot || !Array.isArray(items)) return false;

  // An empty server snapshot can also be the fallback from an optional load
  // timeout. Let the client subscription confirm empty collections so the
  // Overview renders a skeleton instead of a premature empty state.
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
    likedLists: getCollectionItems(initialCollections, 'likedLists', hasSeededCollectionSnapshot),
  };
  const counts = {
    likes: getCollectionCount(initialCollections, 'likes', hasSeededCollectionSnapshot),
    lists: getCollectionCount(initialCollections, 'lists', hasSeededCollectionSnapshot),
    watched: getCollectionCount(initialCollections, 'watched', hasSeededCollectionSnapshot),
    watchlist: getCollectionCount(initialCollections, 'watchlist', hasSeededCollectionSnapshot),
    likedLists: getCollectionCount(initialCollections, 'likedLists', hasSeededCollectionSnapshot),
  };

  return {
    counts: hasSeededCollectionSnapshot ? counts : UNRESOLVED_COLLECTION_COUNTS,
    hasSeededCollectionSnapshot,
    hasSeededItems: {
      likes: hasUsableSeededItems(items.likes, hasSeededCollectionSnapshot),
      lists: hasUsableSeededItems(items.lists, hasSeededCollectionSnapshot),
      watched: hasUsableSeededItems(items.watched, hasSeededCollectionSnapshot),
      watchlist: hasUsableSeededItems(items.watchlist, hasSeededCollectionSnapshot),
      likedLists: hasUsableSeededItems(items.likedLists, hasSeededCollectionSnapshot),
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
    likedLists: Boolean(hasSeededItems?.likedLists && !shouldForcePrivateRefresh),
  };
}

function normalizeMediaIdentity(item = {}) {
  const mediaKey = String(item?.mediaKey || '').trim();
  if (mediaKey) return mediaKey;

  const entityType = String(item?.entityType || item?.media_type || '')
    .trim()
    .toLowerCase();
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
      genreNames: Array.isArray(previousItem.genreNames)
        ? previousItem.genreNames
        : item.genreNames,
      genre_ids: Array.isArray(previousItem.genre_ids) ? previousItem.genre_ids : item.genre_ids,
      genres: Array.isArray(previousItem.genres) ? previousItem.genres : item.genres,
    };
  });
}

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

async function removeWithOptimisticState({
  item,
  serviceCall,
  setConfirmation,
  setItems,
  toast,
  onRemove,
}) {
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
  const clearConfirmation = useCallback(
    () => setItemRemoveConfirmation(null),
    [setItemRemoveConfirmation],
  );

  const handleRemoveListItem = useCallback(
    async (item) => {
      if (!canMutateCollection || !selectedList) return;
      await removeWithOptimisticState({
        item,
        serviceCall: () =>
          toggleUserListItem({ listId: selectedList.id, media: item, userId: auth.user.id }),
        setConfirmation: setItemRemoveConfirmation,
        setItems: setListItems,
        toast,
      });
    },
    [
      auth.user?.id,
      canMutateCollection,
      selectedList,
      setItemRemoveConfirmation,
      setListItems,
      toast,
    ],
  );

  const handleRemoveLike = useCallback(
    async (item) => {
      if (!canMutateCollection) return;
      await removeWithOptimisticState({
        item,
        serviceCall: () =>
          removeUserLike({ media: item, mediaKey: item?.mediaKey || null, userId: auth.user.id }),
        setConfirmation: setItemRemoveConfirmation,
        setItems: setLikes,
        toast,
        onRemove: () => decrementCollectionCount?.('likes'),
      });
    },
    [
      auth.user?.id,
      canMutateCollection,
      decrementCollectionCount,
      setItemRemoveConfirmation,
      setLikes,
      toast,
    ],
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
        onRemove: () => decrementCollectionCount?.('watchlist'),
      });
    },
    [
      auth.user?.id,
      canMutateCollection,
      decrementCollectionCount,
      setItemRemoveConfirmation,
      setWatchlist,
      toast,
    ],
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
        onRemove: () => decrementCollectionCount?.('watched'),
      });
    },
    [
      auth.user?.id,
      canMutateCollection,
      decrementCollectionCount,
      setItemRemoveConfirmation,
      setWatched,
      toast,
    ],
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
        }),
      );
    },
    [clearConfirmation, isOwner, setItemRemoveConfirmation],
  );

  return {
    handleRemoveLike,
    handleRemoveListItem,
    handleRemoveWatchedItem,
    handleRemoveWatchlistItem,
    handleRequestRemoveLike: (item) =>
      requestRemove({
        item,
        onConfirm: handleRemoveLike,
        scope: { descriptionTarget: 'likes', title: 'Like' },
      }),
    handleRequestRemoveListItem: (item) =>
      requestRemove({
        item,
        onConfirm: handleRemoveListItem,
        scope: { descriptionTarget: 'this list', title: 'List Item' },
      }),
    handleRequestRemoveWatchedItem: (item) =>
      requestRemove({
        item,
        onConfirm: handleRemoveWatchedItem,
        scope: { descriptionTarget: 'watched titles', title: 'Watched Item' },
      }),
    handleRequestRemoveWatchlistItem: (item) =>
      requestRemove({
        item,
        onConfirm: handleRemoveWatchlistItem,
        scope: { descriptionTarget: 'watchlist', title: 'Watchlist Item' },
      }),
  };
}

function getCollectionItemReference({ item, selectedList, tab, userId }) {
  if (tab === 'likes') return getLikeDocRef(userId, item);
  if (tab === 'watchlist') return getWatchlistDocRef(userId, item);
  if (tab !== 'lists' || !selectedList?.id) return null;

  const id = item?.mediaKey || item?.entityId || item?.id || null;
  if (!id) return null;

  return {
    id,
    listId: selectedList.id,
    table: 'list_items',
    userId,
  };
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
      const userId = auth.user?.id;
      const setItems =
        tab === 'likes'
          ? setLikes
          : tab === 'watchlist'
            ? setWatchlist
            : tab === 'lists'
              ? setListItems
              : null;

      if (!isOwner || !userId || !setItems || !Array.isArray(nextItems)) return;

      let previousItems = null;
      setItems((currentItems) => {
        previousItems = currentItems;
        return nextItems;
      });

      try {
        const updatedAt = Date.now();
        const updates = nextItems
          .map((item, index) => {
            const reference = getCollectionItemReference({ item, selectedList, tab, userId });
            return reference ? updateUserMediaPosition(reference, updatedAt - index) : null;
          })
          .filter(Boolean);

        await Promise.all(updates);
      } catch (error) {
        if (previousItems) setItems(previousItems);
        toast.error('Could not save custom order');
        throw error;
      }
    },
    [auth.user?.id, isOwner, selectedList, setLikes, setListItems, setWatchlist, toast],
  );
}

const COLLECTION_SUBSCRIPTIONS = Object.freeze([
  Object.freeze({
    key: 'likes',
    label: 'Likes',
    mergeMetadata: true,
    subscribe: subscribeToUserLikes,
  }),
  Object.freeze({
    key: 'watched',
    label: 'Watched movies',
    mergeMetadata: true,
    subscribe: subscribeToUserWatched,
  }),
  Object.freeze({
    key: 'watchlist',
    label: 'Watchlist',
    mergeMetadata: true,
    subscribe: subscribeToUserWatchlist,
  }),
  Object.freeze({
    key: 'lists',
    label: 'Lists',
    mergeMetadata: false,
    subscribe: subscribeToUserLists,
  }),
  Object.freeze({
    key: 'likedLists',
    label: 'Liked lists',
    mergeMetadata: false,
    subscribe: subscribeToLikedLists,
  }),
]);

function subscribeToAccountCollection({
  config,
  isDisposed,
  limitCount,
  seededItems,
  setCollectionCounts,
  setItems,
  setLoading,
  toast,
  userId,
}) {
  const hasSeededCollectionItems = Array.isArray(seededItems);

  return config.subscribe(
    userId,
    (nextItems) => {
      if (isDisposed()) return;
      const items = Array.isArray(nextItems) ? nextItems : [];

      setItems((currentItems) =>
        config.mergeMetadata
          ? mergeCollectionItemsWithExistingMetadata(currentItems, items)
          : items,
      );
      setCollectionCounts((currentCounts) => ({
        ...currentCounts,
        [config.key]: limitCount > 0 ? currentCounts[config.key] : items.length,
      }));
      setLoading(false);
    },
    {
      emitCachedPayloadOnSubscribe: hasSeededCollectionItems,
      fetchOnSubscribe: true,
      limitCount,
      onError: (error) => {
        if (isDisposed()) return;
        setLoading(false);
        notifyAccountLoadError(toast, error, config.label);
      },
      refreshOnSubscribe: !hasSeededCollectionItems,
      seededItems,
    },
  );
}

function applyCollectionSnapshot({
  counts,
  items,
  setCollectionCounts,
  setItemsByKey,
  setLoadingByKey,
}) {
  Object.entries(setItemsByKey).forEach(([key, setItems]) => {
    setItems(items[key] || []);
    setLoadingByKey[key](false);
  });
  setCollectionCounts(counts);
}

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
  const normalizedPreviewLimits = useMemo(
    () => getCollectionPreviewLimits(previewLimits),
    [previewLimits],
  );
  const seededState = useMemo(
    () => createSeededCollectionState({ initialCollections, resolvedUserId }),
    [initialCollections, resolvedUserId],
  );
  const shouldForcePrivateRefresh = !isOwner && isPrivateProfile === true && canViewPrivateContent;
  const shouldUseSeeded = useMemo(
    () =>
      getSeededCollectionUsage({
        hasSeededItems: seededState.hasSeededItems,
        shouldForcePrivateRefresh,
      }),
    [seededState.hasSeededItems, shouldForcePrivateRefresh],
  );

  const [likes, setLikes] = useState(seededState.items.likes);
  const [watched, setWatched] = useState(seededState.items.watched);
  const [watchlist, setWatchlist] = useState(seededState.items.watchlist);
  const [lists, setLists] = useState(seededState.items.lists);
  const [likedLists, setLikedLists] = useState(seededState.items.likedLists || []);
  const [collectionCounts, setCollectionCounts] = useState(seededState.counts);
  const [isLikesLoading, setIsLikesLoading] = useState(!shouldUseSeeded.likes);
  const [isWatchedLoading, setIsWatchedLoading] = useState(!shouldUseSeeded.watched);
  const [isWatchlistLoading, setIsWatchlistLoading] = useState(!shouldUseSeeded.watchlist);
  const [isListsLoading, setIsListsLoading] = useState(!shouldUseSeeded.lists);
  const [isLikedListsLoading, setIsLikedListsLoading] = useState(!shouldUseSeeded.likedLists);

  useEffect(() => {
    const isPreviewOnlyMode = hasAnyCollectionPreviewLimit(normalizedPreviewLimits);
    const normalizedActiveTab = String(activeTab || '')
      .trim()
      .toLowerCase();
    const shouldScopeByActiveTab = normalizedActiveTab && normalizedActiveTab !== 'overview';
    const activeCollectionKey = shouldScopeByActiveTab ? normalizedActiveTab : null;
    const setItemsByKey = {
      likedLists: setLikedLists,
      likes: setLikes,
      lists: setLists,
      watched: setWatched,
      watchlist: setWatchlist,
    };
    const setLoadingByKey = {
      likedLists: setIsLikedListsLoading,
      likes: setIsLikesLoading,
      lists: setIsListsLoading,
      watched: setIsWatchedLoading,
      watchlist: setIsWatchlistLoading,
    };

    if (!resolvedUserId) {
      applyCollectionSnapshot({
        counts: EMPTY_COLLECTION_COUNTS,
        items: EMPTY_COLLECTION_ITEMS,
        setCollectionCounts,
        setItemsByKey,
        setLoadingByKey,
      });
      return undefined;
    }

    if (!authIsReady) return undefined;

    if (isOwner && !authIsAuthenticated) {
      applyCollectionSnapshot({
        counts: seededState.hasSeededCollectionSnapshot
          ? seededState.counts
          : createCollectionCountsForUnavailableState(isPreviewOnlyMode),
        items: seededState.hasSeededCollectionSnapshot ? seededState.items : EMPTY_COLLECTION_ITEMS,
        setCollectionCounts,
        setItemsByKey,
        setLoadingByKey,
      });
      return undefined;
    }

    let isDisposed = false;
    const hasBeenDisposed = () => isDisposed;

    const unsubscribers = COLLECTION_SUBSCRIPTIONS.map((config) => {
      const shouldSubscribe = !activeCollectionKey || activeCollectionKey === config.key;
      if (!shouldSubscribe) {
        setLoadingByKey[config.key](false);
        return () => {};
      }

      return subscribeToAccountCollection({
        config,
        isDisposed: hasBeenDisposed,
        limitCount: normalizedPreviewLimits[config.key],
        seededItems: shouldUseSeeded[config.key] ? seededState.items[config.key] : null,
        setCollectionCounts,
        setItems: setItemsByKey[config.key],
        setLoading: setLoadingByKey[config.key],
        toast,
        userId: resolvedUserId,
      });
    });

    return () => {
      isDisposed = true;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [
    activeTab,
    authIsAuthenticated,
    authIsReady,
    isOwner,
    normalizedPreviewLimits,
    resolvedUserId,
    seededState.counts,
    seededState.hasSeededCollectionSnapshot,
    seededState.items,
    shouldUseSeeded,
    toast,
  ]);

  return {
    collectionCounts,
    isLoadingCollections:
      isLikesLoading ||
      isWatchedLoading ||
      isWatchlistLoading ||
      isListsLoading ||
      isLikedListsLoading,
    isLikedListsLoading,
    isLikesLoading,
    isListsLoading,
    isWatchedLoading,
    isWatchlistLoading,
    likedLists,
    likes,
    lists,
    setCollectionCounts,
    setLikedLists,
    setLikes,
    setLists,
    setWatched,
    setWatchlist,
    watched,
    watchlist,
  };
}
