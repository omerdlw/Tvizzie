'use client';

import { useEffect, useMemo, useRef } from 'react';

import { useSeededFeedState } from '@/features/account/hooks/section-page';
import { isPermissionDeniedError, logDataError } from '@/core/utils';
import { fetchAccountActivityFeed } from '@/core/services/activity/activity.service';
import AccountActivityFeed from '@/features/account/feeds/activity';

function hasMatchingInitialFeed(initialFeed = null, resolvedUserId = null) {
  return Boolean(initialFeed?.userId && resolvedUserId && initialFeed.userId === resolvedUserId);
}

export default function AccountActivityOverview({
  canViewPrivateContent = false,
  emptyMessage = 'No activity yet',
  icon = 'solar:bolt-bold',
  initialFeed = null,
  isOwner = false,
  isPrivateProfile = false,
  isViewerReady = false,
  limit = 5,
  resolvedUserId = null,
  summaryLabel = '',
  title = 'Recent Activity',
  titleHref = null,
}) {
  const requestRef = useRef(0);
  const feedState = useSeededFeedState(initialFeed);
  const {
    applyFeedResult,
    feedError,
    hasMore,
    isFeedLoading,
    items,
    resetFeed,
    setFeedError,
    setIsFeedLoading,
    syncFeed,
    totalCount,
  } = feedState;
  const normalizedLimit = Number.isFinite(Number(limit)) ? Math.max(1, Math.floor(Number(limit))) : 5;
  const hasInitialFeed = useMemo(
    () => hasMatchingInitialFeed(initialFeed, resolvedUserId),
    [initialFeed, resolvedUserId]
  );
  const shouldBlockFeedLoad = useMemo(() => {
    if (hasInitialFeed) {
      return false;
    }

    if (!isViewerReady || !resolvedUserId) {
      return true;
    }

    return !isOwner && isPrivateProfile && !canViewPrivateContent;
  }, [canViewPrivateContent, hasInitialFeed, isOwner, isPrivateProfile, isViewerReady, resolvedUserId]);

  useEffect(() => {
    if (!hasInitialFeed) {
      return;
    }

    syncFeed(initialFeed);
  }, [hasInitialFeed, initialFeed, syncFeed]);

  useEffect(() => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    if (shouldBlockFeedLoad) {
      resetFeed();
      return;
    }

    if (hasInitialFeed) {
      setIsFeedLoading(false);
      return;
    }

    let ignore = false;

    async function loadFeed() {
      setIsFeedLoading(true);
      setFeedError(null);

      try {
        const result = await fetchAccountActivityFeed({
          pageSize: normalizedLimit,
          scope: 'user',
          sort: 'newest',
          subject: 'all',
          userId: resolvedUserId,
        });

        if (ignore || requestRef.current !== requestId) {
          return;
        }

        applyFeedResult(result, { append: false });
      } catch (error) {
        if (ignore || requestRef.current !== requestId) {
          return;
        }

        resetFeed();

        if (!isPermissionDeniedError(error)) {
          logDataError('[AccountOverview] Activity feed could not be loaded:', error);
          setFeedError('Activity could not be loaded right now.');
        }
      } finally {
        if (!ignore && requestRef.current === requestId) {
          setIsFeedLoading(false);
        }
      }
    }

    void loadFeed();

    return () => {
      ignore = true;
    };
  }, [
    applyFeedResult,
    hasInitialFeed,
    normalizedLimit,
    resetFeed,
    resolvedUserId,
    setFeedError,
    setIsFeedLoading,
    shouldBlockFeedLoad,
  ]);

  const visibleItems = useMemo(() => (Array.isArray(items) ? items.slice(0, normalizedLimit) : []), [items, normalizedLimit]);
  const resolvedTotalCount = Number.isFinite(Number(totalCount)) ? Math.max(visibleItems.length, Number(totalCount)) : visibleItems.length;

  return (
    <AccountActivityFeed
      emptyMessage={emptyMessage}
      icon={icon}
      isLoading={isFeedLoading}
      items={visibleItems}
      loadError={feedError}
      showSeeMore={Boolean(titleHref) && (hasMore || resolvedTotalCount > normalizedLimit)}
      summaryLabel={summaryLabel}
      title={title}
      titleHref={titleHref}
      totalCount={resolvedTotalCount}
    />
  );
}
