'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { useSeededFeedState } from '@/domains/account/hooks/feed-state';
import { isPermissionDeniedError, logDataError } from '@/domains/account/utils/validation';
import { fetchAccountActivityFeed } from '@/domains/account/client/account-api';
import AccountActivityFeed from '@/domains/account/ui/sections/feeds/activity';

function hasMatchingInitialFeed(initialFeed = null, resolvedUserId = null) {
  return Boolean(initialFeed?.userId && resolvedUserId && initialFeed.userId === resolvedUserId);
}

export default function AccountActivityOverview({
  canViewPrivateContent = false,
  emptyMessage = 'No activity yet',
  icon = 'solar:bolt-bold',
  initialFeed = null,
  isInitialSection = false,
  isOwner = false,
  isPrivateProfile = false,
  isViewerReady = false,
  limit = 5,
  revealDelay = 0,
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

  const normalizedLimit = Number.isFinite(Number(limit))
    ? Math.max(1, Math.floor(Number(limit)))
    : 5;

  const effectiveResolvedUserId = resolvedUserId || initialFeed?.userId || null;

  const hasInitialFeed = useMemo(
    () => hasMatchingInitialFeed(initialFeed, effectiveResolvedUserId),
    [initialFeed, effectiveResolvedUserId],
  );
  const hasUsableSeededFeed = useMemo(
    () => hasInitialFeed && Array.isArray(initialFeed?.items) && initialFeed.items.length > 0,
    [hasInitialFeed, initialFeed],
  );
  const [hasRequestedFeed, setHasRequestedFeed] = useState(hasUsableSeededFeed);

  useEffect(() => {
    if (!hasInitialFeed) {
      return;
    }

    syncFeed(initialFeed);
  }, [hasInitialFeed, initialFeed, syncFeed]);

  useEffect(() => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    if (!effectiveResolvedUserId) {
      setHasRequestedFeed(true);
      return;
    }

    if (!isOwner && isPrivateProfile && !canViewPrivateContent) {
      setHasRequestedFeed(true);
      resetFeed();
      return;
    }

    if (hasUsableSeededFeed) {
      setHasRequestedFeed(true);
      setIsFeedLoading(false);
      return;
    }

    let ignore = false;

    async function loadFeed() {
      setHasRequestedFeed(true);
      setIsFeedLoading(true);
      setFeedError(null);

      try {
        const result = await fetchAccountActivityFeed({
          pageSize: normalizedLimit,
          scope: 'user',
          sort: 'newest',
          subject: 'all',
          userId: effectiveResolvedUserId,
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
    canViewPrivateContent,
    effectiveResolvedUserId,
    hasUsableSeededFeed,
    isOwner,
    isPrivateProfile,
    normalizedLimit,
    resetFeed,
    setFeedError,
    setIsFeedLoading,
  ]);

  const visibleItems = useMemo(
    () => (Array.isArray(items) ? items.slice(0, normalizedLimit) : []),
    [items, normalizedLimit],
  );
  const resolvedTotalCount = Number.isFinite(Number(totalCount))
    ? Math.max(visibleItems.length, Number(totalCount))
    : visibleItems.length;
  const isInitialFeedLoading =
    Boolean(effectiveResolvedUserId) && !hasUsableSeededFeed && !hasRequestedFeed;

  return (
    <AccountActivityFeed
      emptyMessage={emptyMessage}
      icon={icon}
      isInitialSection={isInitialSection}
      isLoading={isFeedLoading || isInitialFeedLoading}
      items={visibleItems}
      loadError={feedError}
      revealDelay={revealDelay}
      showSeeMore={Boolean(titleHref) && (hasMore || resolvedTotalCount > normalizedLimit)}
      summaryLabel={summaryLabel}
      title={title}
      titleHref={titleHref}
      totalCount={resolvedTotalCount}
    />
  );
}
