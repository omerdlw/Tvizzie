'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import {
  useAccountSectionPage,
  useSeededFeedState,
} from '@/features/account/hooks/section-page';
import { buildManagedQueryString, parseActivityFilters, toActivityQueryValues } from '@/features/account/filtering';
import { logDataError } from '@/core/utils/errors';
import { useAuth } from '@/core/modules/auth';
import { fetchAccountActivityFeed } from '@/core/services/activity/activity.service';
import ActivityView from './view';

const ACTIVITY_FETCH_PAGE_SIZE = 36;

function normalizeScope(value) {
  return value === 'following' ? 'following' : 'user';
}

function normalizePage(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

function parseInitialActivityControls(searchParams) {
  const filters = parseActivityFilters(searchParams);

  return {
    filters: {
      sort: filters.sort,
      subject: filters.subject,
    },
    page: normalizePage(searchParams?.get?.('page')),
    scope: normalizeScope(searchParams?.get?.('scope')),
  };
}

function hasMatchingSeededActivityFeed({
  filters,
  initialFeed = null,
  page,
  resolvedUserId = null,
  scope = 'user',
}) {
  if (!initialFeed?.userId || !resolvedUserId || initialFeed.userId !== resolvedUserId) {
    return false;
  }

  return (
    normalizeScope(initialFeed?.scope) === normalizeScope(scope) &&
    normalizePage(initialFeed?.page) === normalizePage(page) &&
    String(initialFeed?.subject || 'all') === String(filters?.subject || 'all') &&
    String(initialFeed?.sort || 'newest') === String(filters?.sort || 'newest')
  );
}

export default function Client({
  initialActivityFeed = null,
  initialCollections = null,
  initialProfile = null,
  initialResolvedUserId = null,
  initialResolveError = null,
  username,
}) {
  const auth = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialControls = useMemo(() => parseInitialActivityControls(searchParams), [searchParams]);
  const [activeScope, setActiveScope] = useState(initialControls.scope);
  const [activityFilters, setActivityFilters] = useState(initialControls.filters);
  const [currentPage, setCurrentPage] = useState(initialControls.page);
  const latestRequestRef = useRef(0);
  const {
    canViewProfileCollections,
    canViewPrivateContent,
    followerCount,
    followingCount,
    followState,
    handleEditProfile,
    handleFollow,
    handleOpenFollowList,
    handleSignInRequest,
    isBioSurfaceOpen,
    isFollowLoading,
    isOwner,
    isPageLoading,
    isPrivateProfile,
    isResolvingProfile,
    isViewerReady,
    itemRemoveConfirmation,
    likeCount,
    listCount,
    pendingFollowRequestCount,
    profile,
    resolveError,
    resolvedUserId,
    setIsBioSurfaceOpen,
    unfollowConfirmation,
    watchlistCount,
  } = useAccountSectionPage({
    activeTab: 'activity',
    auth,
    initialCollections,
    initialProfile,
    initialResolvedUserId,
    initialResolveError,
    username,
  });
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
  }, [
    canViewPrivateContent,
    hasSeededActivityFeed,
    isOwner,
    isPrivateProfile,
    isViewerReady,
    effectiveResolvedUserId,
  ]);

  const replaceActivityUrl = useCallback(
    (nextScope, nextFilters, nextPage) => {
      if (typeof window === 'undefined') {
        return;
      }

      const params = new URLSearchParams(window.location.search);

      if (normalizeScope(nextScope) === 'user') {
        params.delete('scope');
      } else {
        params.set('scope', 'following');
      }

      const queryString = buildManagedQueryString(params, {
        managedKeys: ['asub', 'asort'],
        resetPage: false,
        values: toActivityQueryValues(nextFilters),
      });
      const nextParams = new URLSearchParams(queryString);

      if (normalizePage(nextPage) <= 1) {
        nextParams.delete('page');
      } else {
        nextParams.set('page', String(normalizePage(nextPage)));
      }

      const nextQuery = nextParams.toString();
      window.history.replaceState({}, '', nextQuery ? `${pathname}?${nextQuery}` : pathname);
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

  const loadActivity = useCallback(
    async () => {
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
    },
    [
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
    ]
  );

  useEffect(() => {
    loadActivity();
  }, [activeScope, activityFilters.sort, activityFilters.subject, auth.user?.id, currentPage, isViewerReady, loadActivity]);

  const handleScopeChange = useCallback(
    (nextScope) => {
      const normalizedScope = nextScope === 'following' ? 'following' : 'user';

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

  return (
    <ActivityView
      auth={auth}
      activeScope={activeScope}
      canShowActivity={canViewProfileCollections}
      feedError={feedError}
      followerCount={followerCount}
      followingCount={followingCount}
      followState={followState}
      handleEditProfile={handleEditProfile}
      handleFollow={handleFollow}
      handleOpenFollowList={handleOpenFollowList}
      handleSignInRequest={handleSignInRequest}
      isBioSurfaceOpen={isBioSurfaceOpen}
      isFeedLoading={isFeedLoading}
      isFollowLoading={isFollowLoading}
      isOwner={isOwner}
      isPageLoading={isPageLoading}
      isResolvingProfile={isResolvingProfile}
      itemRemoveConfirmation={itemRemoveConfirmation}
      items={items}
      likeCount={likeCount}
      listCount={listCount}
      activityFilters={activityFilters}
      currentPage={currentPage}
      onFiltersChange={handleFiltersChange}
      onPageChange={handlePageChange}
      onScopeChange={handleScopeChange}
      pendingFollowRequestCount={pendingFollowRequestCount}
      profile={profile}
      resolveError={resolveError}
      resolvedUserId={resolvedUserId}
      setIsBioSurfaceOpen={setIsBioSurfaceOpen}
      unfollowConfirmation={unfollowConfirmation}
      username={username}
      watchlistCount={watchlistCount}
      totalCount={totalCount}
    />
  );
}
