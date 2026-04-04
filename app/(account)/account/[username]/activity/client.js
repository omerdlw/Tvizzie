'use client';

import { useCallback, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
  hasMatchingSeededFeed,
  shouldBlockAccountFeedLoad,
  useAccountSectionPage,
  useSeededFeedState,
} from '@/features/account/section-client-hooks';
import { logDataError } from '@/core/utils/errors';
import { useAuth } from '@/core/modules/auth';
import { fetchAccountActivityFeed } from '@/core/services/activity/activity.service';
import ActivityView from './view';

export default function Client({
  initialActivityFeed = null,
  initialCollections = null,
  initialProfile = null,
  initialResolvedUserId = null,
  initialResolveError = null,
  username,
}) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeScope = searchParams.get('scope') === 'following' ? 'following' : 'user';
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
  const {
    applyFeedResult,
    cursor,
    feedError,
    hasMore,
    isFeedLoading,
    items,
    resetFeed,
    setFeedError,
    setIsFeedLoading,
    syncFeed,
  } = useSeededFeedState(initialActivityFeed);
  const hasSeededActivityFeed =
    !shouldForcePrivateRefresh &&
    hasMatchingSeededFeed({
      expectedValue: activeScope,
      initialFeed: initialActivityFeed,
      resolvedUserId,
      valueKey: 'scope',
    });
  const shouldBlockFeedLoad = shouldBlockAccountFeedLoad({
    canViewPrivateContent,
    hasSeededFeed: hasSeededActivityFeed,
    isOwner,
    isPrivateProfile,
    isViewerReady,
    resolvedUserId,
  });

  useEffect(() => {
    if (!hasSeededActivityFeed) {
      return;
    }

    syncFeed(initialActivityFeed);
  }, [hasSeededActivityFeed, initialActivityFeed, syncFeed]);

  const loadActivity = useCallback(
    async ({ append = false } = {}) => {
      if (shouldBlockFeedLoad) {
        resetFeed();
        return;
      }

      if (!append && hasSeededActivityFeed) {
        setIsFeedLoading(false);
        return;
      }

      setIsFeedLoading(true);
      setFeedError(null);

      try {
        const result = await fetchAccountActivityFeed({
          cursor: append ? cursor : null,
          scope: activeScope,
          userId: resolvedUserId,
        });

        applyFeedResult(result, { append });
      } catch (error) {
        if (!append) {
          resetFeed();
        }

        logDataError('[Account] Activity could not be loaded:', error);
        setFeedError('Activity could not be loaded right now.');
      } finally {
        setIsFeedLoading(false);
      }
    },
    [
      activeScope,
      applyFeedResult,
      cursor,
      hasSeededActivityFeed,
      resolvedUserId,
      resetFeed,
      setFeedError,
      setIsFeedLoading,
      shouldBlockFeedLoad,
    ]
  );

  useEffect(() => {
    loadActivity();
  }, [activeScope, auth.user?.id, isViewerReady, loadActivity]);

  const handleScopeChange = useCallback(
    (nextScope) => {
      const normalizedScope = nextScope === 'following' ? 'following' : 'user';

      if (normalizedScope === activeScope) {
        return;
      }

      const params = new URLSearchParams(searchParams.toString());

      if (normalizedScope === 'user') {
        params.delete('scope');
      } else {
        params.set('scope', normalizedScope);
      }

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [activeScope, pathname, router, searchParams]
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
      hasMore={hasMore}
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
      loadActivity={loadActivity}
      onScopeChange={handleScopeChange}
      pendingFollowRequestCount={pendingFollowRequestCount}
      profile={profile}
      resolveError={resolveError}
      resolvedUserId={resolvedUserId}
      setIsBioSurfaceOpen={setIsBioSurfaceOpen}
      unfollowConfirmation={unfollowConfirmation}
      username={username}
      watchlistCount={watchlistCount}
    />
  );
}
