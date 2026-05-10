'use client';

import { notifyAccountLoadError } from '@/features/account/shared/load-error';
import {
  ensureLegacyFavoritesBackfilled,
  subscribeToUserLikes,
  subscribeToUserLists,
  subscribeToUserWatched,
  subscribeToUserWatchlist,
} from '@/core/services/media';
import { mergeCollectionItemsWithExistingMetadata } from './metadata';

function updatePreviewCount(setCollectionCounts, key, itemCount) {
  setCollectionCounts((current) => ({
    ...current,
    [key]: Math.max(current?.[key] ?? 0, itemCount),
  }));
}

export async function subscribeToAccountCollectionStreams({
  hasSeededCollectionSnapshot,
  isMounted,
  isOwner,
  isPreviewOnlyMode,
  limits,
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
}) {
  let unsubscribeLikes = () => {};
  let unsubscribeWatched = () => {};
  let unsubscribeWatchlist = () => {};
  let unsubscribeLists = () => {};

  if (isOwner) {
    await ensureLegacyFavoritesBackfilled(resolvedUserId);
  }

  if (!isMounted()) {
    return () => {};
  }

  if (!hasSeededCollectionSnapshot) {
    setCollectionCounts({
      likes: null,
      lists: null,
      watched: null,
      watchlist: null,
    });
  }

  if (shouldSubscribe.likes) {
    unsubscribeLikes = subscribeToUserLikes(
      resolvedUserId,
      (nextLikes) => {
        setLikes(nextLikes);
        if (isPreviewOnlyMode) {
          updatePreviewCount(setCollectionCounts, 'likes', nextLikes.length);
        }
        markStreamAsResolved('likes');
      },
      {
        activeTab: normalizedActiveTab || null,
        emitCachedPayloadOnSubscribe: !shouldForcePrivateRefresh,
        fetchOnSubscribe: shouldForcePrivateRefresh || !shouldUseSeeded.likes,
        refreshOnSubscribe: shouldForcePrivateRefresh || normalizedActiveTab === 'likes',
        limitCount: limits.likes,
        onError: (error) => {
          notifyAccountLoadError(toast, error, 'Likes could not be loaded');
          markStreamAsResolved('likes');
        },
      }
    );
  }

  if (shouldSubscribe.watched) {
    unsubscribeWatched = subscribeToUserWatched(
      resolvedUserId,
      (nextWatched) => {
        setWatched((currentWatched) => mergeCollectionItemsWithExistingMetadata(currentWatched, nextWatched));
        if (isPreviewOnlyMode) {
          updatePreviewCount(setCollectionCounts, 'watched', nextWatched.length);
        }
        markStreamAsResolved('watched');
      },
      {
        activeTab: normalizedActiveTab || null,
        emitCachedPayloadOnSubscribe: !shouldForcePrivateRefresh,
        fetchOnSubscribe: shouldForcePrivateRefresh || !shouldUseSeeded.watched,
        refreshOnSubscribe: shouldForcePrivateRefresh || normalizedActiveTab === 'watched',
        limitCount: limits.watched,
        onError: (error) => {
          notifyAccountLoadError(toast, error, 'Watched could not be loaded');
          markStreamAsResolved('watched');
        },
      }
    );
  }

  if (shouldSubscribe.watchlist) {
    unsubscribeWatchlist = subscribeToUserWatchlist(
      resolvedUserId,
      (nextWatchlist) => {
        setWatchlist((currentWatchlist) => mergeCollectionItemsWithExistingMetadata(currentWatchlist, nextWatchlist));
        if (isPreviewOnlyMode) {
          updatePreviewCount(setCollectionCounts, 'watchlist', nextWatchlist.length);
        }
        markStreamAsResolved('watchlist');
      },
      {
        activeTab: normalizedActiveTab || null,
        emitCachedPayloadOnSubscribe: !shouldForcePrivateRefresh,
        fetchOnSubscribe: shouldForcePrivateRefresh || !shouldUseSeeded.watchlist,
        refreshOnSubscribe: shouldForcePrivateRefresh || normalizedActiveTab === 'watchlist',
        limitCount: limits.watchlist,
        onError: (error) => {
          notifyAccountLoadError(toast, error, 'Watchlist could not be loaded');
          markStreamAsResolved('watchlist');
        },
      }
    );
  }

  if (shouldSubscribe.lists) {
    unsubscribeLists = subscribeToUserLists(
      resolvedUserId,
      (nextLists) => {
        setLists(nextLists);
        if (isPreviewOnlyMode) {
          updatePreviewCount(setCollectionCounts, 'lists', nextLists.length);
        }
        markStreamAsResolved('lists');
      },
      {
        activeTab: normalizedActiveTab || null,
        emitCachedPayloadOnSubscribe: !shouldForcePrivateRefresh,
        fetchOnSubscribe: shouldForcePrivateRefresh || !shouldUseSeeded.lists,
        refreshOnSubscribe: shouldForcePrivateRefresh || normalizedActiveTab === 'lists',
        limitCount: limits.lists,
        onError: (error) => {
          notifyAccountLoadError(toast, error, 'Lists could not be loaded');
          markStreamAsResolved('lists');
        },
      }
    );
  }

  return () => {
    unsubscribeLikes();
    unsubscribeWatched();
    unsubscribeWatchlist();
    unsubscribeLists();
  };
}
