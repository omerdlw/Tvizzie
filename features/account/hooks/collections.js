'use client';

import { useToast } from '@/core/modules/notification/hooks';
import { ensureLegacyFavoritesBackfilled, subscribeToUserLikes } from '@/core/services/media/likes';
import { subscribeToUserLists } from '@/core/services/media/lists';
import { subscribeToUserWatched, subscribeToUserWatchlist } from '@/core/services/media/watched-watchlist';
import { notifyAccountLoadError } from '@/features/account/utils';
import { useEffect, useMemo, useState } from 'react';

import { mergeCollectionItemsWithExistingMetadata } from './collection-metadata';
import {
  EMPTY_COLLECTION_COUNTS,
  UNRESOLVED_COLLECTION_COUNTS,
  createCollectionCountsForUnavailableState,
  createSeededCollectionState,
  getCollectionPreviewLimits,
  getSeededCollectionUsage,
  hasAnyCollectionPreviewLimit,
} from './collection-seed-state';

export { mergeCollectionItemsWithExistingMetadata } from './collection-metadata';

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
  const seededState = useMemo(
    () =>
      createSeededCollectionState({
        initialCollections,
        resolvedUserId,
      }),
    [initialCollections, resolvedUserId]
  );
  const shouldForcePrivateRefresh = !isOwner && isPrivateProfile === true && canViewPrivateContent;
  const shouldUseSeeded = useMemo(
    () =>
      getSeededCollectionUsage({
        hasSeededItems: seededState.hasSeededItems,
        shouldForcePrivateRefresh,
      }),
    [seededState.hasSeededItems, shouldForcePrivateRefresh]
  );

  const [likes, setLikes] = useState(seededState.items.likes);
  const [watched, setWatched] = useState(seededState.items.watched);
  const [watchlist, setWatchlist] = useState(seededState.items.watchlist);
  const [lists, setLists] = useState(seededState.items.lists);
  const [collectionCounts, setCollectionCounts] = useState(seededState.counts);
  const [isLoadingCollections, setIsLoadingCollections] = useState(!seededState.hasSeededCollectionSnapshot);

  useEffect(() => {
    const isPreviewOnlyMode = hasAnyCollectionPreviewLimit(normalizedPreviewLimits);
    const normalizedActiveTab = String(activeTab || '')
      .trim()
      .toLowerCase();

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
      setCollectionCounts(EMPTY_COLLECTION_COUNTS);
      setIsLoadingCollections(false);
      return undefined;
    }

    if (isOwner && (!authIsReady || !authIsAuthenticated)) {
      if (seededState.hasSeededCollectionSnapshot) {
        setLikes(seededState.items.likes);
        setWatched(seededState.items.watched);
        setWatchlist(seededState.items.watchlist);
        setLists(seededState.items.lists);
        setCollectionCounts(seededState.counts);
        setIsLoadingCollections(false);
        return undefined;
      }

      setLikes([]);
      setWatched([]);
      setWatchlist([]);
      setLists([]);
      setCollectionCounts(createCollectionCountsForUnavailableState(isPreviewOnlyMode));
      setIsLoadingCollections(true);
      return undefined;
    }

    if (!isOwner && isPrivateProfile && !canViewPrivateContent) {
      if (seededState.hasSeededCollectionSnapshot) {
        setLikes(seededState.items.likes);
        setWatched(seededState.items.watched);
        setWatchlist(seededState.items.watchlist);
        setLists(seededState.items.lists);
        setCollectionCounts(seededState.counts);
        setIsLoadingCollections(false);
        return undefined;
      }

      setLikes([]);
      setWatched([]);
      setWatchlist([]);
      setLists([]);
      setCollectionCounts(EMPTY_COLLECTION_COUNTS);
      setIsLoadingCollections(false);
      return undefined;
    }

    let isMounted = true;
    setLikes(seededState.items.likes);
    setWatched(seededState.items.watched);
    setWatchlist(seededState.items.watchlist);
    setLists(seededState.items.lists);
    setCollectionCounts(seededState.counts);

    const resolvedStreamState = {
      likes: shouldSubscribeLikes ? shouldUseSeeded.likes : true,
      lists: shouldSubscribeLists ? shouldUseSeeded.lists : true,
      watched: shouldSubscribeWatched ? shouldUseSeeded.watched : true,
      watchlist: shouldSubscribeWatchlist ? shouldUseSeeded.watchlist : true,
    };

    let hasResolvedCollectionCounts = seededState.hasSeededCollectionSnapshot || !isPreviewOnlyMode;

    const haveAllCollectionStreamsResolved = () =>
      resolvedStreamState.likes &&
      resolvedStreamState.watched &&
      resolvedStreamState.watchlist &&
      resolvedStreamState.lists;

    setIsLoadingCollections(!seededState.hasSeededCollectionSnapshot || !haveAllCollectionStreamsResolved());

    const resolveLoadingState = () => {
      if (seededState.hasSeededCollectionSnapshot) {
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

      if (!seededState.hasSeededCollectionSnapshot) {
        setCollectionCounts(UNRESOLVED_COLLECTION_COUNTS);
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
            fetchOnSubscribe: shouldForcePrivateRefresh || !shouldUseSeeded.likes,
            refreshOnSubscribe: shouldForcePrivateRefresh || normalizedActiveTab === 'likes',
            limitCount: normalizedPreviewLimits.likes,
            onError: (error) => {
              notifyAccountLoadError(toast, error, 'Likes could not be loaded');
              markStreamAsResolved('likes');
            },
          }
        );
      }

      if (shouldSubscribeWatched) {
        unsubscribeWatched = subscribeToUserWatched(
          resolvedUserId,
          (nextWatched) => {
            setWatched((currentWatched) => mergeCollectionItemsWithExistingMetadata(currentWatched, nextWatched));
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
            fetchOnSubscribe: shouldForcePrivateRefresh || !shouldUseSeeded.watched,
            refreshOnSubscribe: shouldForcePrivateRefresh || normalizedActiveTab === 'watched',
            limitCount: normalizedPreviewLimits.watched,
            onError: (error) => {
              notifyAccountLoadError(toast, error, 'Watched could not be loaded');
              markStreamAsResolved('watched');
            },
          }
        );
      }

      if (shouldSubscribeWatchlist) {
        unsubscribeWatchlist = subscribeToUserWatchlist(
          resolvedUserId,
          (nextWatchlist) => {
            setWatchlist((currentWatchlist) =>
              mergeCollectionItemsWithExistingMetadata(currentWatchlist, nextWatchlist)
            );
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
            fetchOnSubscribe: shouldForcePrivateRefresh || !shouldUseSeeded.watchlist,
            refreshOnSubscribe: shouldForcePrivateRefresh || normalizedActiveTab === 'watchlist',
            limitCount: normalizedPreviewLimits.watchlist,
            onError: (error) => {
              notifyAccountLoadError(toast, error, 'Watchlist could not be loaded');
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
            fetchOnSubscribe: shouldForcePrivateRefresh || !shouldUseSeeded.lists,
            refreshOnSubscribe: shouldForcePrivateRefresh || normalizedActiveTab === 'lists',
            limitCount: normalizedPreviewLimits.lists,
            onError: (error) => {
              notifyAccountLoadError(toast, error, 'Lists could not be loaded');
              markStreamAsResolved('lists');
            },
          }
        );
      }
    }

    subscribeToCollections().catch((error) => {
      if (!isMounted) return;
      notifyAccountLoadError(toast, error, 'Collections could not be loaded');
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
    isOwner,
    isPrivateProfile,
    normalizedPreviewLimits,
    resolvedUserId,
    seededState,
    shouldForcePrivateRefresh,
    shouldUseSeeded,
    toast,
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
