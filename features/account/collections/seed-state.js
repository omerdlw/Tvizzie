'use client';

import { useMemo } from 'react';

const EMPTY_COLLECTION_COUNTS = Object.freeze({
  likes: null,
  lists: null,
  watched: null,
  watchlist: null,
});

function normalizeSeedCount(counts, key) {
  const rawValue = counts?.[key];

  if (rawValue === null || rawValue === undefined) {
    return null;
  }

  return Number(rawValue) || 0;
}

function hasUsableSeededItems({ counts, hasSeededCollectionSnapshot, items, key }) {
  if (!hasSeededCollectionSnapshot || !Array.isArray(items)) {
    return false;
  }

  if (items.length > 0) {
    return true;
  }

  return normalizeSeedCount(counts, key) === 0;
}

export function useCollectionSeedState({
  canViewPrivateContent,
  initialCollections = null,
  isOwner,
  isPrivateProfile,
  resolvedUserId,
}) {
  const hasSeededCollectionSnapshot = Boolean(
    initialCollections?.userId && resolvedUserId && initialCollections.userId === resolvedUserId
  );

  const initialItems = useMemo(
    () => ({
      likes:
        hasSeededCollectionSnapshot && Array.isArray(initialCollections?.likes) ? initialCollections.likes : [],
      lists:
        hasSeededCollectionSnapshot && Array.isArray(initialCollections?.lists) ? initialCollections.lists : [],
      watched:
        hasSeededCollectionSnapshot && Array.isArray(initialCollections?.watched) ? initialCollections.watched : [],
      watchlist:
        hasSeededCollectionSnapshot && Array.isArray(initialCollections?.watchlist)
          ? initialCollections.watchlist
          : [],
    }),
    [hasSeededCollectionSnapshot, initialCollections]
  );

  const initialCollectionCounts = useMemo(
    () =>
      hasSeededCollectionSnapshot
        ? {
            likes: normalizeSeedCount(initialCollections?.counts, 'likes'),
            lists: normalizeSeedCount(initialCollections?.counts, 'lists'),
            watched: normalizeSeedCount(initialCollections?.counts, 'watched'),
            watchlist: normalizeSeedCount(initialCollections?.counts, 'watchlist'),
          }
        : EMPTY_COLLECTION_COUNTS,
    [hasSeededCollectionSnapshot, initialCollections]
  );

  const shouldForcePrivateRefresh = !isOwner && isPrivateProfile === true && canViewPrivateContent;

  const shouldUseSeeded = useMemo(
    () => ({
      likes:
        hasUsableSeededItems({
          counts: initialCollections?.counts,
          hasSeededCollectionSnapshot,
          items: initialItems.likes,
          key: 'likes',
        }) && !shouldForcePrivateRefresh,
      lists:
        hasUsableSeededItems({
          counts: initialCollections?.counts,
          hasSeededCollectionSnapshot,
          items: initialItems.lists,
          key: 'lists',
        }) && !shouldForcePrivateRefresh,
      watched:
        hasUsableSeededItems({
          counts: initialCollections?.counts,
          hasSeededCollectionSnapshot,
          items: initialItems.watched,
          key: 'watched',
        }) && !shouldForcePrivateRefresh,
      watchlist:
        hasUsableSeededItems({
          counts: initialCollections?.counts,
          hasSeededCollectionSnapshot,
          items: initialItems.watchlist,
          key: 'watchlist',
        }) && !shouldForcePrivateRefresh,
    }),
    [hasSeededCollectionSnapshot, initialCollections, initialItems, shouldForcePrivateRefresh]
  );

  return {
    hasSeededCollectionSnapshot,
    initialCollectionCounts,
    initialItems,
    shouldForcePrivateRefresh,
    shouldUseSeeded,
  };
}
