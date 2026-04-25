'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAccountPageActions } from '@/features/account/hooks/page-actions';
import { useAccountPageData } from '@/features/account/hooks/page-data';
import { getFollowState } from '@/features/account/utils';

function noop() {}

const IS_SOCIAL_FOLLOWS_ENABLED = true;

function scheduleDeferredTask(task) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  if (typeof window.requestIdleCallback === 'function') {
    const requestId = window.requestIdleCallback(
      () => {
        task();
      },
      { timeout: 1200 }
    );

    return () => window.cancelIdleCallback?.(requestId);
  }

  const timeoutId = window.setTimeout(task, 150);
  return () => window.clearTimeout(timeoutId);
}

export function hasMatchingSeededFeed({
  expectedValue = null,
  initialFeed = null,
  resolvedUserId = null,
  valueKey = 'mode',
}) {
  if (!initialFeed?.userId || !resolvedUserId) {
    return false;
  }

  if (initialFeed.userId !== resolvedUserId) {
    return false;
  }

  if (!valueKey) {
    return true;
  }

  return (initialFeed?.[valueKey] ?? expectedValue) === expectedValue;
}

export function shouldBlockAccountFeedLoad({
  canViewPrivateContent,
  hasSeededFeed = false,
  isOwner,
  isPrivateProfile,
  isViewerReady,
  resolvedUserId,
}) {
  if (hasSeededFeed) {
    return false;
  }

  if (!isViewerReady || !resolvedUserId) {
    return true;
  }

  return !isOwner && isPrivateProfile && !canViewPrivateContent;
}

export function useSeededFeedState(initialFeed = null) {
  const [items, setItems] = useState(Array.isArray(initialFeed?.items) ? initialFeed.items : []);
  const [cursor, setCursor] = useState(initialFeed?.nextCursor ?? null);
  const [hasMore, setHasMore] = useState(Boolean(initialFeed?.hasMore));
  const [totalCount, setTotalCount] = useState(
    Number.isFinite(Number(initialFeed?.totalCount))
      ? Math.max(0, Math.floor(Number(initialFeed.totalCount)))
      : Array.isArray(initialFeed?.items)
        ? initialFeed.items.length
        : 0
  );
  const [isFeedLoading, setIsFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState(initialFeed?.error || null);

  const resetFeed = useCallback(() => {
    setItems([]);
    setCursor(null);
    setFeedError(null);
    setHasMore(false);
    setTotalCount(0);
    setIsFeedLoading(false);
  }, []);

  const applyFeedResult = useCallback((result, { append = false } = {}) => {
    const incomingItems = Array.isArray(result?.items) ? result.items : [];
    const explicitTotalCount = Number.isFinite(Number(result?.totalCount))
      ? Math.max(0, Math.floor(Number(result.totalCount)))
      : null;

    setItems((current) => (append ? [...current, ...incomingItems] : incomingItems));
    setCursor(result?.nextCursor ?? null);
    setFeedError(null);
    setHasMore(Boolean(result?.hasMore));

    if (explicitTotalCount !== null) {
      setTotalCount(explicitTotalCount);
    } else if (append) {
      setTotalCount((current) => current + incomingItems.length);
    } else {
      setTotalCount(incomingItems.length);
    }
  }, []);

  const syncFeed = useCallback((nextFeed = null) => {
    const nextItems = Array.isArray(nextFeed?.items) ? nextFeed.items : [];
    const nextTotalCount = Number.isFinite(Number(nextFeed?.totalCount))
      ? Math.max(0, Math.floor(Number(nextFeed.totalCount)))
      : nextItems.length;

    setItems(nextItems);
    setCursor(nextFeed?.nextCursor ?? null);
    setFeedError(nextFeed?.error || null);
    setHasMore(Boolean(nextFeed?.hasMore));
    setTotalCount(nextTotalCount);
    setIsFeedLoading(false);
  }, []);

  return {
    applyFeedResult,
    cursor,
    feedError,
    hasMore,
    isFeedLoading,
    items,
    resetFeed,
    setFeedError,
    setIsFeedLoading,
    setItems,
    setTotalCount,
    syncFeed,
    totalCount,
  };
}

export function useDeferredPreviewFeed({
  canLoad,
  hasSeededFeed = false,
  initialFeed = null,
  loadFeed,
  onLoadError = null,
}) {
  const feedState = useSeededFeedState(initialFeed);
  const { applyFeedResult, resetFeed, setFeedError, setIsFeedLoading, syncFeed } = feedState;

  useEffect(() => {
    if (!hasSeededFeed) {
      return;
    }

    syncFeed(initialFeed);
  }, [hasSeededFeed, initialFeed, syncFeed]);

  useEffect(() => {
    if (!canLoad && !hasSeededFeed) {
      resetFeed();
      return undefined;
    }

    if (hasSeededFeed) {
      setIsFeedLoading(false);
      return undefined;
    }

    let ignore = false;

    async function loadDeferredFeed() {
      setIsFeedLoading(true);
      setFeedError(null);

      const result = await loadFeed().then(
        (value) => ({ status: 'fulfilled', value }),
        (reason) => ({ status: 'rejected', reason })
      );

      if (ignore) {
        return;
      }

      if (result.status === 'fulfilled') {
        applyFeedResult(result.value);
      } else {
        resetFeed();

        const nextError = typeof onLoadError === 'function' ? onLoadError(result.reason) : null;

        if (nextError) {
          setFeedError(nextError);
        }
      }

      setIsFeedLoading(false);
    }

    const cancelDeferredStart = scheduleDeferredTask(loadDeferredFeed);

    return () => {
      ignore = true;
      cancelDeferredStart();
    };
  }, [applyFeedResult, canLoad, hasSeededFeed, loadFeed, onLoadError, resetFeed, setFeedError, setIsFeedLoading]);

  return feedState;
}

export function useAccountSectionPage({
  activeListId = '',
  activeTab,
  auth,
  collectionPreviewLimits = null,
  initialCollections = null,
  initialProfile = null,
  initialResolvedUserId = null,
  initialResolveError = null,
  selectedList = null,
  username,
}) {
  const [isBioSurfaceOpen, setIsBioSurfaceOpen] = useState(false);
  const pageData = useAccountPageData({
    activeListId,
    activeTab,
    auth,
    collectionPreviewLimits,
    initialCollections,
    initialProfile,
    initialResolvedUserId,
    initialResolveError,
    isSocialFollowsEnabled: IS_SOCIAL_FOLLOWS_ENABLED,
    username,
  });
  const {
    canViewPrivateContent,
    followRelationship,
    hasResolvedAccessState,
    isAuthSessionReady,
    isLoadingCollections,
    isOwner,
    isResolvingProfile,
    isPrivateProfile,
    listItems,
    profile,
    resolvedUserId,
    setLikes,
    setLists,
    setListItems,
    setWatched,
    setWatchlist,
  } = pageData;

  useEffect(() => {
    setIsBioSurfaceOpen(false);
  }, [profile?.description, resolvedUserId]);

  const pageActions = useAccountPageActions({
    activeListId,
    auth,
    canViewPrivateContent,
    followRelationship,
    isOwner,
    isPrivateProfile,
    listItems,
    profile,
    resolvedUserId,
    selectedList,
    setLikes,
    setLists,
    setListItems,
    setWatched,
    setWatchlist,
    updateQuery: noop,
    profileHandle: username,
  });

  const canViewProfileCollections = !isPrivateProfile || isOwner || canViewPrivateContent;

  return {
    ...pageActions,
    ...pageData,
    canViewProfileCollections,
    followState: getFollowState(followRelationship),
    isBioSurfaceOpen,
    isPageLoading:
      isResolvingProfile ||
      (Boolean(resolvedUserId) &&
        (!profile || !hasResolvedAccessState || (canViewPrivateContent && isLoadingCollections))),
    isViewerReady: auth.isReady && isAuthSessionReady,
    setIsBioSurfaceOpen,
  };
}
