'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import { useSeededFeedState } from '@/features/account/hooks/section-page';
import { normalizePage } from '@/features/account/filtering';
import { logDataError } from '@/core/utils';
import { fetchAccountActivityFeed } from '@/core/services/activity/activity.service';
import { createAccountSectionClient } from '@/features/account/route/section-factory';
import ActivityView from './view';
import {
  ACTIVITY_FETCH_PAGE_SIZE,
  hasMatchingSeededActivityFeed,
  normalizeActivityScope,
  parseInitialActivityControls,
  replaceActivityHistory,
} from './activity-state';

function useActivityClientState({ auth, routeData, sectionProviderValue, sectionState }) {
  const { initialActivityFeed = null, initialResolvedUserId = null } = routeData || {};
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialControls = useMemo(() => parseInitialActivityControls(searchParams), [searchParams]);
  const [activeScope, setActiveScope] = useState(initialControls.scope);
  const [activityFilters, setActivityFilters] = useState(initialControls.filters);
  const [currentPage, setCurrentPage] = useState(initialControls.page);
  const latestRequestRef = useRef(0);
  const { canViewPrivateContent, isOwner, isPrivateProfile, isViewerReady, resolvedUserId } = sectionState;
  const shouldForcePrivateRefresh = !isOwner && isPrivateProfile === true && canViewPrivateContent;
  const effectiveResolvedUserId = resolvedUserId || initialResolvedUserId || null;
  const {
    applyFeedResult,
    feedError,
    isFeedLoading,
    items,
    resetFeed,
    setFeedError,
    setIsFeedLoading,
    syncFeed,
    totalCount,
  } = useSeededFeedState(initialActivityFeed);
  const hasSeededActivityFeed = useMemo(
    () =>
      !shouldForcePrivateRefresh &&
      hasMatchingSeededActivityFeed({
        filters: activityFilters,
        initialFeed: initialActivityFeed,
        page: currentPage,
        resolvedUserId: effectiveResolvedUserId,
        scope: activeScope,
      }),
    [activeScope, activityFilters, currentPage, effectiveResolvedUserId, initialActivityFeed, shouldForcePrivateRefresh]
  );

  const shouldBlockFeedLoad = useMemo(() => {
    if (hasSeededActivityFeed) {
      return false;
    }

    if (!isViewerReady || !effectiveResolvedUserId) {
      return true;
    }

    return !isOwner && isPrivateProfile && !canViewPrivateContent;
  }, [canViewPrivateContent, hasSeededActivityFeed, isOwner, isPrivateProfile, isViewerReady, effectiveResolvedUserId]);

  const replaceActivityUrl = useCallback(
    (nextScope, nextFilters, nextPage) => {
      replaceActivityHistory({
        filters: nextFilters,
        page: nextPage,
        pathname,
        scope: nextScope,
      });
    },
    [pathname]
  );

  useEffect(() => {
    if (!hasSeededActivityFeed) {
      return;
    }

    syncFeed(initialActivityFeed);
  }, [hasSeededActivityFeed, initialActivityFeed, syncFeed]);

  useEffect(() => {
    const nextControls = parseInitialActivityControls(searchParams);

    setActiveScope(nextControls.scope);
    setActivityFilters(nextControls.filters);
    setCurrentPage(nextControls.page);
  }, [searchParams]);

  const loadActivity = useCallback(async () => {
    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;

    if (shouldBlockFeedLoad) {
      resetFeed();
      return;
    }

    if (hasSeededActivityFeed) {
      setIsFeedLoading(false);
      return;
    }

    setIsFeedLoading(true);
    setFeedError(null);

    try {
      const result = await fetchAccountActivityFeed({
        cursor: (currentPage - 1) * ACTIVITY_FETCH_PAGE_SIZE,
        pageSize: ACTIVITY_FETCH_PAGE_SIZE,
        scope: activeScope,
        sort: activityFilters.sort,
        subject: activityFilters.subject,
        userId: effectiveResolvedUserId,
      });

      if (latestRequestRef.current !== requestId) {
        return;
      }

      applyFeedResult(result, { append: false });
    } catch (error) {
      if (latestRequestRef.current !== requestId) {
        return;
      }

      if (!hasSeededActivityFeed) {
        resetFeed();
      }

      logDataError('[Account] Activity could not be loaded:', error);
      setFeedError('Activity could not be loaded right now.');
    } finally {
      if (latestRequestRef.current === requestId) {
        setIsFeedLoading(false);
      }
    }
  }, [
    activeScope,
    applyFeedResult,
    activityFilters.sort,
    activityFilters.subject,
    currentPage,
    effectiveResolvedUserId,
    hasSeededActivityFeed,
    resetFeed,
    setFeedError,
    setIsFeedLoading,
    shouldBlockFeedLoad,
  ]);

  useEffect(() => {
    loadActivity();
  }, [
    activeScope,
    activityFilters.sort,
    activityFilters.subject,
    auth.user?.id,
    currentPage,
    isViewerReady,
    loadActivity,
  ]);

  const handleScopeChange = useCallback(
    (nextScope) => {
      const normalizedScope = normalizeActivityScope(nextScope);

      if (normalizedScope === activeScope) {
        return;
      }

      setActiveScope(normalizedScope);
      setCurrentPage(1);
      replaceActivityUrl(normalizedScope, activityFilters, 1);
    },
    [activeScope, activityFilters, replaceActivityUrl]
  );

  const handleFiltersChange = useCallback(
    (nextFilters) => {
      setActivityFilters(nextFilters);
      setCurrentPage(1);
      replaceActivityUrl(activeScope, nextFilters, 1);
    },
    [activeScope, replaceActivityUrl]
  );

  const handlePageChange = useCallback(
    (nextPage) => {
      const normalizedPage = normalizePage(nextPage);

      if (normalizedPage === currentPage) {
        return;
      }

      setCurrentPage(normalizedPage);
      replaceActivityUrl(activeScope, activityFilters, normalizedPage);
    },
    [activeScope, activityFilters, currentPage, replaceActivityUrl]
  );

  return {
    activeScope,
    activityFilters,
    currentPage,
    feedError,
    isFeedLoading,
    items,
    onFiltersChange: handleFiltersChange,
    onPageChange: handlePageChange,
    onScopeChange: handleScopeChange,
    providerValue: sectionProviderValue,
    totalCount,
  };
}

export default createAccountSectionClient({
  activeTab: 'activity',
  displayName: 'AccountActivityClient',
  View: ActivityView,
  useSectionClientState: useActivityClientState,
});
