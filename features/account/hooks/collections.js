'use client';

import {
  ensureLegacyFavoritesBackfilled,
  subscribeToUserLikes,
} from '@/core/services/media/likes.service';
import {
  subscribeToUserLists,
} from '@/core/services/media/lists.service';
import { subscribeToUserWatched } from '@/core/services/media/watched.service';
import { subscribeToUserWatchlist } from '@/core/services/media/watchlist.service';
import { useToast } from '@/core/modules/notification/hooks';
import { isPermissionDeniedError } from '@/core/utils/errors';
import { useCallback, useEffect, useMemo, useState } from 'react';

function showAccountLoadError(toast, error, fallbackMessage) {
  if (isPermissionDeniedError(error)) {
    return false;
  }

  toast.error(error?.message || fallbackMessage);
  return true;
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
  const likesPreviewLimit = Number(previewLimits?.likes) || 0;
  const listsPreviewLimit = Number(previewLimits?.lists) || 0;
  const watchedPreviewLimit = Number(previewLimits?.watched) || 0;
  const watchlistPreviewLimit = Number(previewLimits?.watchlist) || 0;

  const hasSeededCollectionSnapshot =
    initialCollections?.userId && resolvedUserId && initialCollections.userId === resolvedUserId;

  const resolveSeedCount = useCallback(
    (key) => {
      if (!hasSeededCollectionSnapshot) {
        return null;
      }

      const rawValue = initialCollections?.counts?.[key];

      if (rawValue === null || rawValue === undefined) {
        return null;
      }

      return Number(rawValue) || 0;
    },
    [hasSeededCollectionSnapshot, initialCollections]
  );

  const hasUsableSeededItems = useCallback(
    (items, key) => {
      if (!hasSeededCollectionSnapshot || !Array.isArray(items)) {
        return false;
      }

      if (items.length > 0) {
        return true;
      }

      const seededCount = resolveSeedCount(key);

      return seededCount === 0;
    },
    [hasSeededCollectionSnapshot, resolveSeedCount]
  );

  const initialLikes = useMemo(
    () => (hasSeededCollectionSnapshot && Array.isArray(initialCollections?.likes) ? initialCollections.likes : []),
    [hasSeededCollectionSnapshot, initialCollections]
  );
  const initialLists = useMemo(
    () => (hasSeededCollectionSnapshot && Array.isArray(initialCollections?.lists) ? initialCollections.lists : []),
    [hasSeededCollectionSnapshot, initialCollections]
  );
  const initialWatchlist = useMemo(
    () =>
      hasSeededCollectionSnapshot && Array.isArray(initialCollections?.watchlist) ? initialCollections.watchlist : [],
    [hasSeededCollectionSnapshot, initialCollections]
  );
  const initialWatched = useMemo(
    () => hasSeededCollectionSnapshot && Array.isArray(initialCollections?.watched) ? initialCollections.watched : [],
    [hasSeededCollectionSnapshot, initialCollections]
  );
  const initialCollectionCounts = useMemo(
    () =>
      hasSeededCollectionSnapshot
        ? {
            likes:
              initialCollections?.counts?.likes === null || initialCollections?.counts?.likes === undefined
                ? null
                : Number(initialCollections.counts.likes) || 0,
            lists:
              initialCollections?.counts?.lists === null || initialCollections?.counts?.lists === undefined
                ? null
                : Number(initialCollections.counts.lists) || 0,
            watched:
              initialCollections?.counts?.watched === null || initialCollections?.counts?.watched === undefined
                ? null
                : Number(initialCollections.counts.watched) || 0,
            watchlist:
              initialCollections?.counts?.watchlist === null || initialCollections?.counts?.watchlist === undefined
                ? null
                : Number(initialCollections.counts.watchlist) || 0,
          }
        : {
            likes: null,
            lists: null,
            watched: null,
            watchlist: null,
          },
    [hasSeededCollectionSnapshot, initialCollections]
  );

  const hasSeededLikes = hasUsableSeededItems(initialLikes, 'likes');
  const hasSeededLists = hasUsableSeededItems(initialLists, 'lists');
  const hasSeededWatched = hasUsableSeededItems(initialWatched, 'watched');
  const hasSeededWatchlist = hasUsableSeededItems(initialWatchlist, 'watchlist');

  const shouldForcePrivateRefresh = !isOwner && isPrivateProfile === true && canViewPrivateContent;
  const shouldUseSeededLikes = hasSeededLikes && !shouldForcePrivateRefresh;
  const shouldUseSeededLists = hasSeededLists && !shouldForcePrivateRefresh;
  const shouldUseSeededWatched = hasSeededWatched && !shouldForcePrivateRefresh;
  const shouldUseSeededWatchlist = hasSeededWatchlist && !shouldForcePrivateRefresh;

  const [likes, setLikes] = useState(initialLikes);
  const [watched, setWatched] = useState(initialWatched);
  const [watchlist, setWatchlist] = useState(initialWatchlist);
  const [lists, setLists] = useState(initialLists);
  const [collectionCounts, setCollectionCounts] = useState(initialCollectionCounts);
  const [isLoadingCollections, setIsLoadingCollections] = useState(!hasSeededCollectionSnapshot);

  useEffect(() => {
    const isPreviewOnlyMode =
      likesPreviewLimit > 0 || listsPreviewLimit > 0 || watchedPreviewLimit > 0 || watchlistPreviewLimit > 0;
    const normalizedActiveTab = String(activeTab || '')
      .trim()
      .toLowerCase();

    // Scope subscriptions by active account tab to avoid cross-tab cache pollution.
    const shouldScopeByActiveTab = Boolean(normalizedActiveTab);
    const shouldSubscribeLikes = !shouldScopeByActiveTab || normalizedActiveTab === 'likes';
    const shouldSubscribeLists = !shouldScopeByActiveTab || normalizedActiveTab === 'lists';
    const shouldSubscribeWatched = !shouldScopeByActiveTab || normalizedActiveTab === 'watched';
    const shouldSubscribeWatchlist = !shouldScopeByActiveTab || normalizedActiveTab === 'watchlist';

    if (!resolvedUserId) {
      setLikes([]);
      setWatched([]);
      setWatchlist([]);
      setLists([]);
      setCollectionCounts({
        likes: 0,
        lists: 0,
        watched: 0,
        watchlist: 0,
      });
      setIsLoadingCollections(false);
      return undefined;
    }

    if (isOwner && (!authIsReady || !authIsAuthenticated)) {
      if (hasSeededCollectionSnapshot) {
        setLikes(initialLikes);
        setWatched(initialWatched);
        setWatchlist(initialWatchlist);
        setLists(initialLists);
        setCollectionCounts(initialCollectionCounts);
        setIsLoadingCollections(false);
        return undefined;
      }

      setLikes([]);
      setWatched([]);
      setWatchlist([]);
      setLists([]);
      setCollectionCounts({
        likes: isPreviewOnlyMode ? null : 0,
        lists: isPreviewOnlyMode ? null : 0,
        watched: isPreviewOnlyMode ? null : 0,
        watchlist: isPreviewOnlyMode ? null : 0,
      });
      setIsLoadingCollections(true);
      return undefined;
    }

    if (!isOwner && isPrivateProfile && !canViewPrivateContent) {
      if (hasSeededCollectionSnapshot) {
        setLikes(initialLikes);
        setWatched(initialWatched);
        setWatchlist(initialWatchlist);
        setLists(initialLists);
        setCollectionCounts(initialCollectionCounts);
        setIsLoadingCollections(false);
        return undefined;
      }

      setLikes([]);
      setWatched([]);
      setWatchlist([]);
      setLists([]);
      setCollectionCounts({
        likes: 0,
        lists: 0,
        watched: 0,
        watchlist: 0,
      });
      setIsLoadingCollections(false);
      return undefined;
    }

    let isMounted = true;
    setLikes(initialLikes);
    setWatched(initialWatched);
    setWatchlist(initialWatchlist);
    setLists(initialLists);
    setCollectionCounts(initialCollectionCounts);

    const resolvedStreamState = {
      likes: shouldSubscribeLikes ? shouldUseSeededLikes : true,
      lists: shouldSubscribeLists ? shouldUseSeededLists : true,
      watched: shouldSubscribeWatched ? shouldUseSeededWatched : true,
      watchlist: shouldSubscribeWatchlist ? shouldUseSeededWatchlist : true,
    };

    let hasResolvedCollectionCounts = hasSeededCollectionSnapshot || !isPreviewOnlyMode;

    const haveAllCollectionStreamsResolved = () =>
      resolvedStreamState.likes &&
      resolvedStreamState.watched &&
      resolvedStreamState.watchlist &&
      resolvedStreamState.lists;

    setIsLoadingCollections(!hasSeededCollectionSnapshot || !haveAllCollectionStreamsResolved());

    const resolveLoadingState = () => {
      if (hasSeededCollectionSnapshot) {
        setIsLoadingCollections(!haveAllCollectionStreamsResolved());
        return;
      }

      if (hasResolvedCollectionCounts && haveAllCollectionStreamsResolved()) {
        setIsLoadingCollections(false);
      }
    };

    const markStreamAsResolved = (key) => {
      if (resolvedStreamState[key]) return;

      resolvedStreamState[key] = true;
      resolveLoadingState();
    };

    let unsubscribeLikes = () => {};
    let unsubscribeWatched = () => {};
    let unsubscribeWatchlist = () => {};
    let unsubscribeLists = () => {};

    async function subscribeToCollections() {
      if (isOwner) {
        await ensureLegacyFavoritesBackfilled(resolvedUserId);
      }

      if (!isMounted) {
        return;
      }

      if (!hasSeededCollectionSnapshot) {
        setCollectionCounts({
          likes: null,
          lists: null,
          watched: null,
          watchlist: null,
        });
      }

      hasResolvedCollectionCounts = true;
      resolveLoadingState();

      if (shouldSubscribeLikes) {
        unsubscribeLikes = subscribeToUserLikes(
          resolvedUserId,
          (nextLikes) => {
            setLikes(nextLikes);
            if (isPreviewOnlyMode) {
              setCollectionCounts((current) => ({
                ...current,
                likes: Math.max(current?.likes ?? 0, nextLikes.length),
              }));
            }
            markStreamAsResolved('likes');
          },
          {
            activeTab: normalizedActiveTab || null,
            emitCachedPayloadOnSubscribe: !shouldForcePrivateRefresh,
            fetchOnSubscribe: shouldForcePrivateRefresh || !shouldUseSeededLikes,
            refreshOnSubscribe: shouldForcePrivateRefresh || normalizedActiveTab === 'likes',
            limitCount: likesPreviewLimit,
            onError: (error) => {
              showAccountLoadError(toast, error, 'Likes could not be loaded');
              markStreamAsResolved('likes');
            },
          }
        );
      }

      if (shouldSubscribeWatched) {
        unsubscribeWatched = subscribeToUserWatched(
          resolvedUserId,
          (nextWatched) => {
            setWatched(nextWatched);
            if (isPreviewOnlyMode) {
              setCollectionCounts((current) => ({
                ...current,
                watched: Math.max(current?.watched ?? 0, nextWatched.length),
              }));
            }
            markStreamAsResolved('watched');
          },
          {
            activeTab: normalizedActiveTab || null,
            emitCachedPayloadOnSubscribe: !shouldForcePrivateRefresh,
            fetchOnSubscribe: shouldForcePrivateRefresh || !shouldUseSeededWatched,
            refreshOnSubscribe: shouldForcePrivateRefresh || normalizedActiveTab === 'watched',
            limitCount: watchedPreviewLimit,
            onError: (error) => {
              showAccountLoadError(toast, error, 'Watched could not be loaded');
              markStreamAsResolved('watched');
            },
          }
        );
      }

      if (shouldSubscribeWatchlist) {
        unsubscribeWatchlist = subscribeToUserWatchlist(
          resolvedUserId,
          (nextWatchlist) => {
            setWatchlist(nextWatchlist);
            if (isPreviewOnlyMode) {
              setCollectionCounts((current) => ({
                ...current,
                watchlist: Math.max(current?.watchlist ?? 0, nextWatchlist.length),
              }));
            }
            markStreamAsResolved('watchlist');
          },
          {
            activeTab: normalizedActiveTab || null,
            emitCachedPayloadOnSubscribe: !shouldForcePrivateRefresh,
            fetchOnSubscribe: shouldForcePrivateRefresh || !shouldUseSeededWatchlist,
            refreshOnSubscribe: shouldForcePrivateRefresh || normalizedActiveTab === 'watchlist',
            limitCount: watchlistPreviewLimit,
            onError: (error) => {
              showAccountLoadError(toast, error, 'Watchlist could not be loaded');
              markStreamAsResolved('watchlist');
            },
          }
        );
      }

      if (shouldSubscribeLists) {
        unsubscribeLists = subscribeToUserLists(
          resolvedUserId,
          (nextLists) => {
            setLists(nextLists);
            if (isPreviewOnlyMode) {
              setCollectionCounts((current) => ({
                ...current,
                lists: Math.max(current?.lists ?? 0, nextLists.length),
              }));
            }
            markStreamAsResolved('lists');
          },
          {
            activeTab: normalizedActiveTab || null,
            emitCachedPayloadOnSubscribe: !shouldForcePrivateRefresh,
            fetchOnSubscribe: shouldForcePrivateRefresh || !shouldUseSeededLists,
            refreshOnSubscribe: shouldForcePrivateRefresh || normalizedActiveTab === 'lists',
            limitCount: listsPreviewLimit,
            onError: (error) => {
              showAccountLoadError(toast, error, 'Lists could not be loaded');
              markStreamAsResolved('lists');
            },
          }
        );
      }
    }

    subscribeToCollections().catch((error) => {
      if (!isMounted) return;
      showAccountLoadError(toast, error, 'Collections could not be loaded');
      hasResolvedCollectionCounts = true;
      markStreamAsResolved('likes');
      markStreamAsResolved('watched');
      markStreamAsResolved('watchlist');
      markStreamAsResolved('lists');
    });

    return () => {
      isMounted = false;
      unsubscribeLikes();
      unsubscribeWatched();
      unsubscribeWatchlist();
      unsubscribeLists();
    };
  }, [
    activeTab,
    authIsAuthenticated,
    authIsReady,
    canViewPrivateContent,
    hasSeededCollectionSnapshot,
    hasSeededLikes,
    hasSeededLists,
    hasSeededWatched,
    hasSeededWatchlist,
    initialCollectionCounts,
    initialCollections,
    initialLikes,
    initialLists,
    initialWatched,
    initialWatchlist,
    isOwner,
    isPrivateProfile,
    likesPreviewLimit,
    listsPreviewLimit,
    resolvedUserId,
    shouldForcePrivateRefresh,
    shouldUseSeededLikes,
    shouldUseSeededLists,
    shouldUseSeededWatched,
    shouldUseSeededWatchlist,
    toast,
    watchedPreviewLimit,
    watchlistPreviewLimit,
  ]);

  return {
    collectionCounts,
    isLoadingCollections,
    likes,
    lists,
    setLikes,
    setLists,
    setWatched,
    setWatchlist,
    watched,
    watchlist,
  };
}
