'use client';

import { useCallback, useEffect, useState } from 'react';

import { isProjectFeatureEnabled } from '@/config/project.config';
import { useAccountPageActions } from '@/features/account/hooks/page-actions';
import { useAccountPageData } from '@/features/account/hooks/page-data';
import { getFollowState } from '@/features/account/utils';

function noop() {}

const IS_SOCIAL_FOLLOWS_ENABLED = isProjectFeatureEnabled('social_follows');

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
  const [isFeedLoading, setIsFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState(initialFeed?.error || null);

  const resetFeed = useCallback(() => {
    setItems([]);
    setCursor(null);
    setFeedError(null);
    setHasMore(false);
    setIsFeedLoading(false);
  }, []);

  const applyFeedResult = useCallback((result, { append = false } = {}) => {
    setItems((current) => (append ? [...current, ...(result?.items || [])] : result?.items || []));
    setCursor(result?.nextCursor ?? null);
    setFeedError(null);
    setHasMore(Boolean(result?.hasMore));
  }, []);

  const syncFeed = useCallback((nextFeed = null) => {
    setItems(Array.isArray(nextFeed?.items) ? nextFeed.items : []);
    setCursor(nextFeed?.nextCursor ?? null);
    setFeedError(nextFeed?.error || null);
    setHasMore(Boolean(nextFeed?.hasMore));
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
    syncFeed,
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
    profile,
    resolvedUserId,
    selectedList,
    setLikes,
    setLists,
    setListItems,
    setWatched,
    setWatchlist,
    updateQuery: noop,
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
