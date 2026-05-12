'use client';

import { notifyAccountLoadError } from '@/features/account/feedback/account-feedback';
import { useToast } from '@/core/modules/notification/hooks';
import { useEffect, useMemo, useState } from 'react';
import { useCollectionSeedState } from './initial-snapshot';
import { subscribeToAccountCollectionStreams } from './realtime-subscriptions';
import {
  hasCollectionPreviewLimits,
  resolveCollectionPreviewLimits,
  resolveCollectionSubscriptionScope,
} from './subscription-policy';

export { mergeCollectionItemsWithExistingMetadata } from './item-metadata';

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
  const previewLimitState = useMemo(() => resolveCollectionPreviewLimits(previewLimits), [previewLimits]);
  const {
    hasSeededCollectionSnapshot,
    initialCollectionCounts,
    initialItems,
    shouldForcePrivateRefresh,
    shouldUseSeeded,
  } = useCollectionSeedState(
    {
      canViewPrivateContent,
      initialCollections,
      isOwner,
      isPrivateProfile,
      resolvedUserId,
    }
  );

  const [likes, setLikes] = useState(initialItems.likes);
  const [watched, setWatched] = useState(initialItems.watched);
  const [watchlist, setWatchlist] = useState(initialItems.watchlist);
  const [lists, setLists] = useState(initialItems.lists);
  const [collectionCounts, setCollectionCounts] = useState(initialCollectionCounts);
  const [isLoadingCollections, setIsLoadingCollections] = useState(!hasSeededCollectionSnapshot);

  useEffect(() => {
    const isPreviewOnlyMode = hasCollectionPreviewLimits(previewLimitState);
    const { normalizedActiveTab, shouldSubscribe } = resolveCollectionSubscriptionScope(activeTab);

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
        setLikes(initialItems.likes);
        setWatched(initialItems.watched);
        setWatchlist(initialItems.watchlist);
        setLists(initialItems.lists);
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
        setLikes(initialItems.likes);
        setWatched(initialItems.watched);
        setWatchlist(initialItems.watchlist);
        setLists(initialItems.lists);
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
    setLikes(initialItems.likes);
    setWatched(initialItems.watched);
    setWatchlist(initialItems.watchlist);
    setLists(initialItems.lists);
    setCollectionCounts(initialCollectionCounts);

    const resolvedStreamState = {
      likes: shouldSubscribe.likes ? shouldUseSeeded.likes : true,
      lists: shouldSubscribe.lists ? shouldUseSeeded.lists : true,
      watched: shouldSubscribe.watched ? shouldUseSeeded.watched : true,
      watchlist: shouldSubscribe.watchlist ? shouldUseSeeded.watchlist : true,
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

    let unsubscribeStreams = () => {};

    subscribeToAccountCollectionStreams({
      hasSeededCollectionSnapshot,
      isMounted: () => isMounted,
      isOwner,
      isPreviewOnlyMode,
      limits: previewLimitState,
      markStreamAsResolved,
      normalizedActiveTab,
      resolvedUserId,
      setCollectionCounts,
      setLikes,
      setLists,
      setWatched,
      setWatchlist,
      shouldForcePrivateRefresh,
      shouldSubscribe,
      shouldUseSeeded,
      toast,
    })
      .then((unsubscribe) => {
        unsubscribeStreams = unsubscribe;
        if (!isMounted) return;
        hasResolvedCollectionCounts = true;
        resolveLoadingState();
      })
      .catch((error) => {
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
      unsubscribeStreams();
    };
  }, [
    activeTab,
    authIsAuthenticated,
    authIsReady,
    canViewPrivateContent,
    hasSeededCollectionSnapshot,
    initialCollectionCounts,
    initialItems,
    isOwner,
    isPrivateProfile,
    previewLimitState,
    resolvedUserId,
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
